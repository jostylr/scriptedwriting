/*globals $, runScripts, console, marked*/
/*jslint evil : true */


//anon for local closure
var setupRunScripts = function ($, codeMirror, marked) {
  var compile;
  
  
  var global = {
    blocks : {}, //storage objects by name from runscripts
    waiting : {}, //stuff the key is waiting for
    needs : {},  // stuff that needs the key
    dependencies : {}, //stuff the key uses
    libs : {} //libraries loaded, i.e., jsxgraph
  };
  
  var nameCounter = 0;
  
  var newName = function () {
    nameCounter += 1;
    return nameCounter;
  };
  
  var cssParser = function (text) {
    var i, cur, n, pieces, selector, map, ii, nn, properties, prop,
      comreg = /(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)|(\/\/.*)/g,
      styles = {}
    ;

    text = text.replace(comreg, ' ');

    pieces = text.split("}");
    n = pieces.length-1;

    for (i = 0; i < n; i += 1) {
      cur = pieces[i].split("{");
      selector = cur[0].trim(); //trim may not be supported.
      if (styles.hasOwnProperty(selector)) {
        map = styles[selector];
      } else {
        styles[selector] = map = {};    
      }
      properties = cur[1].split(";");
      nn = properties.length;
      for (ii = 0; ii < nn; ii += 1) {
        prop = properties[ii].split(":");
        map[prop[0].trim()] = prop[1].trim();
      }
    }
    return styles;
  };
  

  var actionFactory = function(action, params) {
    return function () {
      var args = Array.prototype.slice.apply(arguments);
      return action.apply(this, args.concat(params));
      
    };
  };

    //from underscore
  var nativeIndexOf = Array.prototype.indexOf;

  var indexOf = function(array, item) {
    if (array === null) {
      return -1;
    }
    var i, l;
    if (nativeIndexOf && array.indexOf === nativeIndexOf) {
      return array.indexOf(item);
    }
    for (i = 0, l = array.length; i < l; i+= 1) {
      if (array.hasOwnPropety(i) && array[i] === item) {
        return i;
      }
    } 
    return -1;
  };
 
  var isEmpty = function(obj) {
    var key;
    //for pure objects only
    for (key in obj){
      if (obj.hasOwnProperty(key) ) {
        return false;
      }
    }
    return true;
  };
 
 
 //end underscore
 
  // parse options, giving defaults, returns the functions that get run
  var actionOptions = function (options, defaults, actions) {
    var i, cur, fun, params, n,
      ret = []
    ;
    
    if (options) {
      options = options.toLowerCase().split(".");
    } else {
      options = [];
    }


    
    n = defaults.length;
    for (i = 0; i < n; i += 1) {
      cur = options[i];
      if (cur) { 
        // if function name(a, b, c)  no nested commas, no nested functions or parentheses. will be passed as a string
        if (cur.indexOf("(") !== -1) {
          fun = cur.split("(");
          cur = fun[0];
          params = fun[1].split(")")[0].split(",");
          ret.push(actionFactory( (actions[cur] || actions[defaults[i]] ), params));
        } else {
          ret.push(actions[cur] || actions[defaults[i]]);
        }
      } else {
        ret.push(defaults[i]);
      }
    }
  };

  var removeFrom = function (arr, val) {
    var position;
    
    position = indexOf(arr, val);
    
    while (position !== -1) {
      arr = arr.slice(0, position).concat(arr.slice(position+1) );
      position = indexOf(arr, val);
    }
    return arr; 
  };


  var checkNeeds = function (storage)  {
    var i, n, cur, needy, waiter,
      needs = global.needs,
      waiting = global.waiting
    ;
    
    
     //check needed stuff
    if (needs.hasOwnProperty(name) ) {
      needy = needs[name];
      n = needy.length;
      for (i = 0; i < n; i += 1) {
        cur = needy[i];
        //remove this from waiting for cur
        if (waiting.hasOwnProperty(cur ) ) {
          waiter = waiting[cur];
          waiting[cur] = removeFrom(waiter, name);
          if (waiter.length === 0) {
            //run cur !!!!!
            /*
            curStorage = global.blocks[cur];
            curActions = [curStorage
            compile(curStorage, )
            */
          } 
        }
      } //for 
      delete needs[name];
    }

  };
  
  // runs the text
  compile = function (storage, actions) {
    var i, n,
      name = storage.name,
      needs = global.needs
    ;
    
    actions = actions || storage.actions;
    n = actions.length;

    for (i = 0; i < n; i += 1) {
      actions[i](storage);
    }
    
    checkNeeds(storage);
    
  };
        


    
  //$(".posts").runScript();

  var getUrl = function (storage) {
    var 
      url = storage.url,
      type = storage.type
    ;
      
    //if fallback html, convert to type
    
    url = url.replace(".html", "."+type);
    $.ajax({
      url: url,
      dataType : "text",
      success: function (data) {
        if (type === "html") {
          data = data.split("<!--split-->")[1];
        }
        compile(storage);
      }
    });    
  };

  //load libs and then call callback
  var loadLibs = function (callback) {
    var 
      libs = global.libs,
      reg = reg ||(/^\s*(lib)\.(js|html|css|less)(.*)/i);
      loading = {};
    ;
    
    //links only, 
    this.find('a').each(function () {
      var type, name, url, 
        self = $(this),
        match = self.text().match(reg);
      ;
      
      if (match) { //library found
        type = match[2];
        name = match[3];
        url = self.attr("href"); 
        self.remove(); // hide link
        if (!(loading.hasOwnProperty(name) )  && (!(libs.hasOwnProperty(name) ) ) ) { //unseen
          loading[name] = 1;
            $.ajax({
               url: url,
               dataType : "text",
               success: function (data) {
                 //parse data according to type
                 
               },
               complete : function () {
                 delete loading[name];
               }
          });
          
        }
        
      }
    
    
  };


  var runScripts = function me (defaults, actions, reg) {
    var name, 
      blocks = global.blocks
    ;
    defaults = $.extend({}, me.defaults, defaults);
    actions = $.extend({}, me.actions, actions);
    reg = reg ||(/^\s*\/?\/?(js|html|css|less|md)([^:\n]*)(:|\n|\r\n|\n\r)/i);

    this.find('code, a').each(function () {
      var url, text, match, type, classes, actionFun, container, par, namesplit,
        storage = {
          results : []
        },
        self = $(this)
      ;
      
      storage.code = self;
      
      // look for match
      storage.originalText = text = self.text();
      storage.match = match = reg.exec(text);
      
      
      if (match) {
        
        //check for siblings, if some, use span, otherwise use div to encapsulate
        if (self.siblings().length === 0) {
          storage.container = container = $("<div class='codeContainer'></div>");
          storage.inline = false;
          storage.pre = par = self.parent("pre");
          if (par.length !== 0) { //pre ?
            par.wrap(container);
            storage.isPre = true;
          } else { 
            self.wrap(container);
          }
        } else {
          storage.container = container = $("<span class='codeContainer'></span>");
          self.wrap(container);
          storage.inline = true;
        }
        
        //clean text
        storage.text = text.replace(reg, '');
        self.text(text);
        
        //type., actions . , name #
        storage.type = type = match[1].toLowerCase();
        namesplit = match[2].split("#");
        storage.name = name = namesplit[1] || newName();
        if (blocks.hasOwnProperty(name)) {
          console.log("OVERWRITING: name already used", storage, blocks[name]);
        }         
        blocks[name] = storage;
        storage.actions = actionFun = actionOptions(namesplit[0], defaults, actions);
        storage.url = url = self.attr("href"); 
        if (url) {
          storage.isLink = true;
          getUrl(storage);
        } else { //code 
          if (storage.isPre ){
            storage.self = par;
          }
          storage.isLink = false;
          compile(storage);
        }
      }
    });
    return this;
  };


  //default is to run the code snippet, make it editable, append each of the results, and give it no name
  runScripts.defaults = ["run", "edit", "append", "none"];


  runScripts.actions = [
    //run|click|none
    { run : function (storage) {
        var result,
          type = storage.type,
          results = storage.results,
          text = storage.text
        ;
        switch (type) {
          case "js" : 
            storage.result = result = eval(text);
          break;
          case "html" :
            storage.result = result = text;
          break;
          case "css" :
            storage.result = result = cssParser(text);
          break;
          case "md" :
            storage.result = result = marked(text);
          break;
        }
        results.push(result);
      }, 
      click : function (storage) {
        
        //setup buttons to click to run. the run click runs run, followed by the append
        
      },
      none : function () {},
      later : function (storage) {  //no functionality for detecting dependency loops!
        var i, n, cur,
          names = Array.prototype.slice.apply(arguments, 1),
          waiting = global.waiting,
          needs = global.needs,
          blocks = global.blocks,
          dependencies = global.dependencies,
          name = storage.name;
          run = true
        ;
        for (i = 0; i < n; i += 1) {
          cur = names[i];
          //dependent for all time
          if (dependencies.hasOwnProperty(cur) ) {
            dependencies[cur].push(name);
          } else {
            dependencies[cur] = [name];
          }
          if (!(blocks.hasOwnProperty(cur) ) ) {
            //name has not been registered yet
            run = false; 
            if (waiting.hasOwnProperty(name) ) {
              waiting[name].push(cur);
            } else {
              waiting[name] = [cur];
            }
            if (needs.hasOwnProperty(cur) ) {
              needs[cur].push(name);
            } else {
              needs[cur] = [name];
            }
            
          }
        }
      }
    },
    //show|hide|edit|toggle
    {
      show : function (container, element, type, text, storage){
        if (element.isLink) {
          if (element.inline) {
            container.prepend("<code>"+text+"</code>");
            element.hide();
          } else {
            container.prepend("<pre><code>"+text+"</pre></code>");
            element.hide();
          }
        }
      },
      hide : function (container, element, type, text, storage){
        container.hide(); 
      },
      edit : function (container, element, type, text, storage){
          var 
            mirror = $("<div class="mirror"></div>")
          ;
          element.replaceWith(mirror);
          CodeMirror(mirror.[0], {
            value : text,
            mode : type
          });
        },  
      },
      toggle : function (container, element, type, text, storage, hide, clickToShow, clickToHide){
        var 
          hideButton = $("<button>"+ ( clickToHide || "Hide Code") + "</button>");
          showButton = $("<button>"+ (clickToShow || "Show Code") + "</button>");
        ;
        if (element.isLink) {
          if (element.inline) {
            element.hide();
            element = $("<code>"+text+"</code>");
            element.inline = true;
            container.prepend(element); 
          } else {
            element.hide();
            element = "<pre><code>"+text+"</pre></code>"
            element.inline = false;
            container.prepend(element);
          }
        }
        
        hideButton.click(function () {
          element.hide();
          hideButton.hide();
          showButton.show();
        });
        showButton.click(function () {
          element.show();
          hideButton.show();
          showButton.hide();
        });
        
        container.append(showButton);
        container.append(hideButton);
        
        if (hide) {
          hideButton.click();
        } else {
          showButton.click();
        }              
      },
    //append|prepend|before|after|html|text
    {
      append : function (container, element, type, text, storage, selector){
        
      },
      prepend : function (container, element, type, text, storage, selector){
        
      },
      before : function (container, element, type, text, storage, selector){
        
      },
      after : function (container, element, type, text, storage, selector){
        
      },
      html : function (container, element, type, text, storage, selector){
        if (selector) {
          if (storage.hasOwnProperty("results")) {
            $(selector).html(storage.result);          
          }          
        } else {
          if (storage.hasOwnProperty("results")) {
            container.append(storage.result);          
          }            
        }
      },
      text : function (container, element, type, text, storage){
        
      }
    }  
  ];


  $.fn.runScripts = runScripts;
  $.fn.loadLibs = loadLibs;
  
};

//  setpRunScripts(jQuery, codeMirror, marked);

