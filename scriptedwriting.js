/*globals $, runScripts, console, marked*/
/*jslint evil : true, continue : true */

//add trim to strings
(function () {
  // https://github.com/kriskowal/es5-shim/blob/master/es5-shim.js
  var ws = "\x09\x0A\x0B\x0C\x0D \xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
      "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
      "\u2029\uFEFF";
  if (!String.prototype.trim || ws.trim()) {
      // http://blog.stevenlevithan.com/archives/faster-trim-javascript
      // http://perfectionkills.com/whitespace-deviations/
      ws = "[" + ws + "]";
      var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
          trimEndRegexp = new RegExp(ws + ws + "*$");
      String.prototype.trim = function trim() {
          if (this === undefined || this === null) {
              throw new TypeError("can't convert "+this+" to object");
          }
          return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
      };
  }

  
  
} () ); 



//anon for local closure
var setupRunScripts = function ($, codeMirror, marked, less) {
  var commenceActions;
  
  
  var global = {
    blocks : {}, //storage objects by name from runscripts
    needs : {},  // stuff that needs the key
    urls : {} //urls loaded, e.g., jsxgraph
  };
  
  var nameCounter = 0;
  
  var newName = function () {
    nameCounter += 1;
    return nameCounter;
  };
  
  // need to grab stylesheet for scriptedwriting
  var sheet = (function () { //done
    var i, ret,
      ss = document.styleSheets,
      n = ss.length
    ;
    for (i = 0; i < n; i += 1) {
      try {
        ret = ss[i];
        if (ret.cssRules) {
          if (ret.cssRules[0].selectorText === ".scriptedwriting") {
            ret.deleteRule(0);
            ret.rules = ret.cssRules;
            return ret;
          }
          
        } else if (ret.rules) {
          if (ret.rules[0].selectorText === ".scriptedwriting") {
            ret.removeRule(0);
            return ret;
          }          
        }        
      } catch (e) {
        console.log(e);
      }
    }
  }());
  
  
  //converts css syntax into a map for jquery to apply
  var cssParser = function (text) { //done
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
        if (prop.length === 2) {
          map[prop[0].trim()] = prop[1].trim();          
        }
      }
    }
    return styles;
  };
  
  //converts less into css
  var lessParser = (new less.Parser());

  var lessed = function (text) {
    var ret;
    lessParser.parse(text, function (err, css) {
    if (err) {
       if (typeof console !== 'undefined' && console.error) {
         console.error("error in lessed", err);
       } 
       ret = '';
     } else {
       text = css.toCSS();
       ret = text;
     }
    });
    return ret; 
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
    var i, 
      name = storage.name,
      needs = global.needs[name],
      n = needs.length
    ;

    for (i = 0; i < n; i += 1) {
      
      commenceActions.apply(null, needs[i]);
    }

    delete global.needs[name];

  };
  
  // goes through commands. commands passed in as they are often not storage.command, but a some array of commands.
  commenceActions = function (storage, commands) {
    var i, n,
      needy = false,
      name = storage.name,
      actions = storage.actions
    ;
        
    if (! commands) {
      console.log("no commands given to commenceActions", storage, commands);
      return;
    }
    
    n = commands.length;

    for (i = 0; i < n; i += 1) {
      if (actions.hasOwnProperty(commands[i].command) ) {
        needy = actions[commands[i].command](storage, commands[i]) || needy; 
      } else {
        console.log("no action for command", commands[i], actions);        
      }
    }
    
    if ( needy === false) {
      storage.commenced = true;
      if (  global.needs.hasOwnProperty(name)  ) {
        checkNeeds(storage);
      }
    } else {
      storage.commenced = false;
    }
    
  };
        

var containIt = function (storage) { // done
  
  var container$, par$,
    self$ = storage.code$
  ;
    
  if (self$.text().trim() === self$.parent().text().trim()) { //no siblings
    container$ = $("<div class='codeContainer'></div>");
    storage.inline = false;
    storage.pre$ = par$ = self$.parent("pre");
    if (par$.length !== 0) { //pre ?
      par$.wrap(container$);
      storage.container$ = par$.parent();
      storage.isPre = true;
    } else {      
      //link in an empty paragraph. Remove par
      par$ = self$.parent();
      self$.wrap(container$);
      par$.replaceWith(self$.parent());
      
    }
  } else {
    container$ = $("<span class='codeContainer'></span>");
    self$.wrap(container$);
    storage.container$ = self$.parent();
    storage.inline = true;
  }
  
};

    
//parsing a string like: option(par1, par2, "what ever!").option2[run.hide](okay)$my name
// returns an object with actions, name, parent. Each action is an object of {command, parent, actions, parameters}
var parseOptions = function (options, defaults) { //done
  var n, ret, comobj, mode, parents, bin, temp, actions, i, currentLetter, parameters, tail, end, ii, nn, paract, properties;
  
  
  //parse it a character at a time
  options = options.trim();
  n = options.length;
  ret =  {actions : []};
  parents = [];
  if (options[0] === '#' ) {
    if (defaults) {
      options = defaults + options;      
    } else {
      comobj.name = options.slice(1);
      return comobj;
    }
  } else if (options[0] !== '.' ) {
    //improve!!!
    console.log("unrecognized options", options);
    return comobj;
  }
  mode = "action";
  bin = []; //letters go in here
  //create a first action object
  comobj = {};
  ret.actions.push(comobj);
  parents.push(ret);
  actions = ret.actions;
  // 
  // using i=1 
  for (i=1; i < n; i += 1) {
    currentLetter = options[i];
    //console.log(mode, currentLetter, ret, comobj);
    switch (mode) {
      case "action" : 
        switch (currentLetter) {
           case "(" :  // parameters, done
            // make command out of bin and empty it
            if (bin.length !== 0) {
              comobj.command = bin.join("").trim();
              bin = [];
            }
            comobj.parameters = parameters = [];
            mode = "parameters";
          break;
           case "{" :  // parameters, done
            // make command out of bin and empty it
            if (bin.length !== 0) {
              comobj.command = bin.join("").trim();
              bin = [];
            }
            comobj.properties = properties = {};
            mode = "properties";
          break;
          
          case "[" :  // new action level, done
            if (bin.length !== 0) {
              comobj.command = bin.join("").trim();
              bin = [];
            } 
            // create actions in current object, a new action, and then use new action obj
            parents.push(comobj);
            comobj.actions = actions = [];
            comobj = {};
            actions.push(comobj);            
          break;
          case "]" : //end actions, done
            // pop up level
            if (bin.length !== 0) {
              comobj.command = bin.join("").trim();
              bin = [];
            }
            if (!(comobj.hasOwnProperty("command") ) ) {
              //no command, does not exist
              actions.pop();
            }
            if  (actions.length === 0) {
              //push actions from parent on. that which comes before
              paract = parents[parents.length-2].actions;
              
              nn = paract.length-1; // do not include last one since that is this one's parent!
              for (ii = 0; ii < nn; ii += 1) {
                actions.push(paract[ii]);
              }
            }
            
            comobj = parents.pop();
            actions = parents[parents.length-1].actions;
            
            
          break;
          case "'" : // ditto marker? 
            if (options[i+1] === "'")  {
              //ditto
              actions.pop(); //get rid of this object
              //push actions from parent on. that which comes before
              paract = parents[parents.length-2].actions;
              nn = paract.length-1; // do not include last one since that is this one's parent!
              for (ii = 0; ii < nn; ii += 1) {
                actions.push(paract[ii]);
              }
            }
            i = i+1; //advance past quote
          break;
          case '#' :  //name, done
            if (bin.length !== 0) {
              comobj.command =  bin.join("").trim();
              bin = [];
            }
            ret.name = options.slice(i+1);
            return ret;
          case "." :  // new command, done
            if (bin.length !== 0) {
              comobj.command = bin.join("").trim();
              bin = [];
            }
            //new command object
            comobj = {};
            actions.push(comobj);
          break;
          default : //add letter, done
            bin.push(currentLetter);
        }
      break; //option
      case "parameters" :
        // ) and , ' and " are special
        switch (currentLetter) {
          case ")" : //end parameters
            if (bin.length !== 0) {
              temp = bin.join("").trim("");
              if (temp) {
                parameters.push(temp);
              }
              bin = [];
            }
            mode = "action";
          break;
          case "," : //new parameter
          if (bin.length !== 0) {
            temp = bin.join("").trim("");
            if (temp) {
              parameters.push(temp);
            }
            bin = [];
          }
          break;
          case "'" :  //new single quote
          if (bin.length !== 0) {
            temp = bin.join("").trim("");
            if (temp) {
              parameters.push(temp);
            }
            bin = [];
          }
            tail = options.slice(i+1);
            end = tail.indexOf("'");
            if (end === -1) {
              parameters.push(tail);
              i = n;
            } else {
              parameters.push(tail.slice(0, end));
              i += end + 1;
            }
          break;
          case '"' : //new double quote
          if (bin.length !== 0) {
            temp = bin.join("").trim("");
            if (temp) {
              parameters.push(temp);
            }
            bin = [];
          }
            tail = options.slice(i+1);
            end = tail.indexOf('"');
            if (end === -1) {
              parameters.push(tail);
              i = n;
            } else {
              parameters.push(tail.slice(0, end));
              i += end+1;
            }
          break;
          default : 
            bin.push(currentLetter);
        }
        
      break; //parameters      
      case "properties" :
        // } and , ' and " are special as is 
        switch (currentLetter) {
          case "}" : //end parameters
            if (bin.length !== 0) {
              temp = bin.join("").trim("");
              if (temp) {
                properties[temp] = 1;
              }
              bin = [];
            }
            mode = "action";
          break;
          case "," : //new parameter
          if (bin.length !== 0) {
            temp = bin.join("").trim("");
            if (temp) {
              properties[temp] = 1;
            }
            bin = [];
          }
          break;
          case "'" :  //new single quote
          if (bin.length !== 0) {
            temp = bin.join("").trim("");
            if (temp) {
              properties[temp] = 1;
            }
            bin = [];
          }
            tail = options.slice(i+1);
            end = tail.indexOf("'");
            if (end === -1) {
              properties[tail] = 1;
              i = n;
            } else {
              properties[tail.slice(0, end)] = 1;
              i += end + 1;
            }
          break;
          case '"' : //new double quote
          if (bin.length !== 0) {
            temp = bin.join("").trim("");
            if (temp) {
              properties[temp] = 1;
            }
            bin = [];
          }
            tail = options.slice(i+1);
            end = tail.indexOf('"');
            if (end === -1) {
              properties[tail] = 1;
              i = n;
            } else {
              properties[tail.slice(0, end)] = 1;
              i += end+1;
            }
          break;
          default : 
            bin.push(currentLetter);
          
        }
        break; //properties 
    }
    
  }
  
  
  if (bin.length !== 0) {
    comobj.command = bin.join("").trim();
    bin = [];
  }
  
  
  //if here, no name given so generate name;!!!!!
  if (!(ret.hasOwnProperty('name') ) ) {
    ret.name = newName();
  }
  
  return ret; 
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
        commenceActions(storage);
      }
    });    
  };


  var runScripts = function me (defaults, actions, reg) {
    var name, 
      blocks = global.blocks,
      urls = global.urls
    ;
    defaults = defaults || me.defaults;
    actions = $.extend({}, me.actions, actions);
    reg = reg ||(/^\s*\/?\/?(js|html|css|less|md)([^:\n\r]*)(\:|\n|\r\n|\n\r)/i);

    this.find('code, a').each(function () {
      var url, text, match, type, classes, actionFun, container$, par$, namesplit,
        storage = {
          actions : actions,
          results : []
        },
        self$ = $(this)
      ;
      
      storage.code$ = self$;
      
      
      // look for match
      storage.originalText = text = self$.text();
      storage.match = match = reg.exec(text);
      
      
      if (match) {
        
        containIt(storage);
        
        
        //clean text
        storage.text = text = text.replace(reg, '').trim();
        self$.text(text);
        
        //type., actions . , name #
        storage.type = match[1].toLowerCase();
        storage.options = parseOptions(match[2], defaults);
        
        storage.commands = storage.options.actions;
        name = storage.name = storage.options.name;
        delete storage.options;
        
        //console.log(JSON.stringify([storage.commands, storage.name, storage.type, storage.text]))
        
        //store in blocks
        if (blocks.hasOwnProperty(name)) {
          console.log("IGNORING: name already used", storage, blocks[name]);
        } else {
          blocks[name] = storage;          
          storage.commenced = false;
        }
        
        
        storage.url = url = self$.attr("href"); 
        //if url, then load it. check first to see if already loaded. then use storage to run commands. add in lib command for checking
        if (url) {
          /*
          storage.isLink = true;
          if (urls.hasOwnProperty(url) )  {
            if (urls[url].received) {
//              fileIntoStorage(urls[url], storage);
              commenceActions(storage);
            } else {
              //add storage to be called later
              urls[url].callers.push(storage);
            }
          } else {
            urls[url] = {
              retrieved: false,
              callers : [storage],
              executed : false
            };
            getUrl(storage);
          }*/
        } else { //code 
          if (storage.isPre ){
            storage.self$ = par$;
          }
          storage.isLink = false;
                    
          commenceActions(storage, storage.commands);
                    
        }
      }
    });
    return this;
  };


  // defaults need to be type based
  //default is to run the code snippet, make it editable, append each of the results, and give it no name
  runScripts.defaults = ".run.edit[.run.text].text";

  var modes = {
    'js' : 'javascript',
    'md' : 'markdown'
  };

  runScripts.actions = {
    act : function (storage, comobj) {
      var i, n, branch, obj, 
        toRun = comobj.parameters || []
      ;
      
      n = toRun.length;
      for (i = 0; i < n; i += 1) {
        branch = parseOptions(toRun[i]);
        obj = global.blocks[branch.name];
        commenceActions(obj, branch.actions);
      }
      
    },
    //idempotent meaning it can be run again and again until all needs are met
    needs : function (storage, comobj) { // intent is mainly for running after urls fetched, e.g., jsxgraph
      //parameters are names of needs, actions are to be taken when done, property primary makes this a primary when run
      var name, i,
        parameters = comobj.parameters || [],
        n = parameters.length,
        actions = comobj.actions || [],
        properties = comobj.properties 
      ;
            
      for (i = 0; i < n; i += 1) {
        name = parameters[i];
        if (global.blocks.hasOwnProperty(name) && global.blocks[name].commenced === true ) {
          continue; //all parsed and ran
        } 
        if (global.needs.hasOwnProperty(name)) {
          //already needed by something
          global.needs[name].push([storage, [comobj ] ]);
        } else {
          global.needs[name] = [ [storage, [comobj ] ] ];
        }
        if (properties && properties.primary) { // QUESTIONABLE
          storage.primary = [comobj]; //needs is run each time primary is called
        }
        
        return true; //needy
      }
      // all needs met, run it
      if (properties && properties.primary) {
        storage.primary = comobj.actions;
      }
      storage.commenced = (!commenceActions(storage, comobj.actions) );
    
    },
    def : function (storage, comobj) {  //default uses primary
      commenceActions(storage, storage.primary);
    },
    primary : function (storage, comobj) {
      storage.primary = comobj.actions;
      commenceActions(storage, comobj.actions);
    },
    run : function (storage) { 
      var result,
        type = storage.type,
        results = storage.results,
        text = storage.text
      ;
      switch (type) {
        case "js" : 
        try {
          result = eval(storage.text);
        } catch (e) {
          console.log(e);
          result = '';
        }
        break;
        case "html" :
          result = text;
        break;
        case "css" :
          result = cssParser(text);
        break;
        case "md" :
          result = marked(text);
        break;
        case "less" :
          result = lessed(text);
        break;
      }
      storage.result = result;
      results.push(result);
    }, 
    strict : function (storage) {
      "use strict";
       var result;
       try {
         result = eval(storage.text);
       } catch (e) {
         console.log(e);
         result = '';
       }
       storage.result = result;
       storage.results.push(result);
    },
    insert : function (storage, comobj) { //insert html
      var text, target$, parameters,
        type = storage.type
      ;
      
      
      if (type === "html") {
        text = storage.text;
      } else if (type === "md") {
        text = marked(storage.text);
      } else {
        text = storage.result;
      }
      
      
      if (comobj.hasOwnProperty("parameters") ) {
        parameters = comobj.parameters;
      } else {
        parameters = [null, "html"];
      }

      
      if ( (parameters[0] === null) || parameters[0] === "null" ) { //append to container
        if (storage.result$) {
          target$ = storage.result$; 
        } else {
          storage.result$ = target$ = $('<div></div');
          storage.container$.append(target$);
        }       
      } else { //use the selector
        target$ = $(parameters[0]);
      }
      
      // insert
      
      target$[(parameters[1] || "html")](text);
    },
    style : function (storage, comobj) {
      var selector, cssmaps, parameters, target$, text,
        type = storage.type,
        attach = false,
        remove = true
      ;
      if (type === "css") {
        cssmaps = cssParser(storage.text);
      } else if (type === "less") {
        text = lessed(storage.text );
        cssmaps = cssParser(text );
      } else {
        cssmaps = cssParser(storage.result);
      }

      if (comobj.hasOwnProperty("parameters") ) {
        parameters = comobj.parameters;
      } else {
        parameters = [null, "html"];
      }

      if ( (parameters[0] === null) || parameters[0] === "null" ) { //use all
          target$ = $('body');
      } else { //use the selector
        target$ = $(parameters[0]);
      }

      for (selector in cssmaps) {
        target$.find(selector).css(cssmaps[selector]);
      }
     
    },
    attach : function (storage, comobj) {
      var selector, cssmaps, text, i, n, properties, rules, strrules, rule, selectorText,
        type = storage.type,
        attach = false,
        remove = true
      ;
      if (type === "css") {
        cssmaps = cssParser(storage.text);
      } else if (type === "less") {
        text = lessed(storage.text );
        cssmaps = cssParser(text );
      } else {
        cssmaps = cssParser(storage.result);
      }

      if (comobj.hasOwnProperty("properties") ) {
        properties = comobj.properties;
        if (properties.keep) {
          remove = false;
        }
      }
      
      for (selector in cssmaps) {
        rules = cssmaps[selector];
        strrules = "";
        for (rule in rules) {
          strrules +=  rule + ":" + rules[rule] + ";\n";
        }
        if (remove) { //probably don't want to do this on a large sheet
          n = sheet.rules.length;
          for (i = n-1; i > -1; i -= 1) { //delete latest one
            selectorText = sheet.rules[i].selectorText;
            if (selectorText === selector) {
              if (sheet.deleteRule) {
                sheet.deleteRule(i); 
              } else if (sheet.removeRule) {
                sheet.removeRule(i);
              }
              break; // assume one instance 
            }
          }
        }
        if (sheet.insertRule) {
          sheet.insertRule(selector + '{\n' + strrules + '\n}\n', sheet.rules.length);
        } else if (sheet.addRule) {
          sheet.addRule(selector, strrules, sheet.rules.length);
        }          
      }
      
    },
    
    hide : function (storage) { //done
      storage.code$.hide(); 
    },
    edit : function (storage, comobj){ //working. needs sprucing
        var actions, editor,
          mirror = $("<div class='mirror'></div>")
        ;
        storage.code$.replaceWith(mirror);
        editor = codeMirror(mirror[0], {
          value : storage.text,
          mode : (modes[storage.type] || storage.type),
          lineNumbers : true
        });
        if (comobj.hasOwnProperty("actions") ) {
          actions = comobj.actions;
          storage.editButton$ = $("<button>Apply</button>").click(function () {
            storage.text = editor.getValue();
            commenceActions(storage, actions); 
          });
          storage.container$.append(storage.editButton$);
        }
    },
    //parameters: hide, hide button text, show   button text
    toggle : function (storage, comobj){  //done
      var hideButton, showButton, parameters, hide, hcb, scb,
        self$ = storage.code$,
        container$ = storage.container$
      ;
            
      if (comobj.hasOwnProperty("parameters") ) {
        parameters = comobj.parameters;
        hide = parameters[0];
        hcb = parameters[1];
        scb = parameters[2];
      } 
      hideButton = $("<button>"+ (hcb ||  "Hide Code") + "</button>");
      showButton = $("<button>"+ (scb ||  "Show Code") + "</button>");     
      
      hideButton.click(function () {
        self$.hide();
        hideButton.hide();
        showButton.show();
      });
      showButton.click(function () {
        self$.show();
        hideButton.show();
        showButton.hide();
      });
      
      container$.append(showButton);
      container$.append(hideButton);
      
      if (hide === "hide") {
        hideButton.click();
      } else {
        showButton.click();
      }              
    },
    text : function (storage, comobj){ //simple text insert of results. more complicated, use insert
      var selector;
      if (storage.result$) {
        storage.result$.text(storage.result);
      } else {
        storage.result$ = $('<span></span>').text(storage.result);
        storage.container$.append(storage.result$);
      }
    }
  }; 


  $.fn.runScripts = runScripts;
//  $.fn.loadLibs = loadLibs;
  
};

// use fake functions for codeMirror, marked, less so they can be called back later. probably need to setup commenceActions as async.
//  setpRunScripts(jQuery, codeMirror, marked, less);

/*
lib : function (storage) {
  var result,
    type = storage.type,
    results = storage.results,
    text = storage.text
  ;
  
  //run or apply lib only once
  if (global.urls[storage.url].executed === false) {
    switch (type) {
      case "js" : 
        eval(text);
      break;
      case "html" : 
        storage.result = text;
      break;
      case "css" :
        //test in IE. may need something else
        var style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = text;
      break;
      case "md" : //really odd to have this
        storage.result = result = marked(text);
      break;
      case "less" : 
        (new less.Parser()).parse(text, function (err, css) {
          if (err) {
            if (typeof console !== 'undefined' && console.error) {
              console.error(err);
            }
          } else {
            var style = document.createElement('style');
            style.type = 'text/css';
            style.textContent = css.toCSS();
          }
        });
        break;
    }
    
  }
},


click : function (storage, comobj) {
  
  var hideButton, showButton, parameters, hide, hcb, scb,
    self$ = storage.code$,
    container$ = storage.container$
  ;
  
  console.log(storage, comobj);
  
  if (comobj.hasOwnProperty("parameters") ) {
    parameters = comobj.parameters;
    hide = parameters[0];
    hcb = parameters[1];
    scb = parameters[2];
  } 
  hideButton = $("<button>"+ (hcb ||  "Hide Code") + "</button>");
  showButton = $("<button>"+ (scb ||  "Show Code") + "</button>");
  
  if (storage.isLink) {
    if (storage.inline) {
      storage.self$.hide();
      element = $("<code>"+text+"</code>");
      element.inline = true;
      container.prepend(element); 
    } else {
      element.hide();
      element = "<pre><code>"+text+"</pre></code>";
      element.inline = false;
      container.prepend(element);
    }
  }
  
  
  
  hideButton.click(function () {
    self$.hide();
    hideButton.hide();
    showButton.show();
  });
  showButton.click(function () {
    self$.show();
    hideButton.show();
    showButton.hide();
  });
  
  container$.append(showButton);
  container$.append(hideButton);
  
  if (hide === "hide") {
    hideButton.click();
  } else {
    showButton.click();
  }
  
  //setup buttons to click to run. the run click runs run, followed by the append
  
},
need : function (storage, comobj) {  //no functionality for detecting dependency loops!
  var i, n, cur,
    names = Array.prototype.slice.apply(arguments, 1),
    waiting = global.waiting,
    needs = global.needs,
    blocks = global.blocks,
    dependencies = global.dependencies,
    name = storage.name,
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
},
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
*/
