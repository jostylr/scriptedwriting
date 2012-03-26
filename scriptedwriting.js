/*globals $, runScripts, console, marked, execScripts, less, jade, CoffeeScript*/
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


var SW = {
  blocks : {}, //storage objects by name from runscripts
  needs : {},  // stuff that needs the key
  urls : {} //urls loaded, e.g., jsxgraph
};  //for sharing

// assigning eval to an alias elevates scope to global scope which is preferred. Still returns last result.
// IE8- behaves as normal with alias. execScripts does global scope, but does not return results :(
var geval = eval;
 
try {
  if (execScripts) {
    geval = function (text) {
      execScripts(text);
      return eval(execScripts); // best I can do for supporting results in IE8-
    };
  }
} catch (e) {
  geval = eval;
}



//anon for local closure
var setupRunScripts = function sRS ($, codeMirror, theme, defurl) {
  
  
  var libs = {
    loaded : {},
    loading : {}
  };
  
  defurl = defurl || "vendor/";
  
  var parseFactory;
  
  // this is mental. creates a function that loads up a script and grabs that external function and uses it to run
  parseFactory = sRS.parseFactory = function (type, command, url, setup) {
    return function (storage, libs, cb) {
      if (libs[type] ) {
        command(storage, cb); 
      } else {
        if (libs.loaded[url]) {
          libs[type] = command;
          command(storage, cb);
        } else if (libs.loading.hasOwnProperty(url) ) {
          libs.loading[url].push([storage, cb, type, command]);
        } else {
          libs.loading[url] = [[storage, cb, type, command]];
          $.ajax({
            url: url,
            dataType : "script",
            success: function () {
              var i, temp,
                toLoad = libs.loading[url],
                n = toLoad.length
              ;
              if (setup) {
                setup();
              }
              libs[type] = command;
              for (i = 0; i < n; i += 1) {
                temp = libs.loading[url][i];
                libs[temp[2]] = temp[3];
                temp[3].call(null, temp[0], temp[1]);
              }
              delete libs.loading[url];
              libs.loaded[url] = true;
            }
          }); //ajax
        } 
      }
    };
  };
  
  var parsers = {
    js : function (storage, libs, cb) {
      storage.parsed = storage.text;
      cb();
    },
    html : function (storage, libs, cb) {
      storage.parsed = storage.text;
      cb();
    }, 
    css : function (storage, libs, cb) {
      storage.parsed = storage.text;
      cb();
    },
    md : sRS.parseFactory("md", function (s, cb) {s.parsed = marked(s.text); cb(); }, defurl + "marking.js"),
    less : sRS.parseFactory("less", function (s, cb) {s.parsed = less.sw(s.text); cb();}, defurl + "less.js", 
      function () {
        //converts less into css
        var lessParser = (new less.Parser());

        less.sw = function (text) {
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
      
      }
    ),
    jade : sRS.parseFactory("jade", function (s, cb) {console.log("huh", s.text); s.parsed =  jade.compile(s.text)();  cb();}, defurl + "jade.js"),
    jadec : sRS.parseFactory("jadec", function(s, cb) {s.parsed =  jade.compile(s.text); cb();}, defurl + "jade.js"),
    coffeescript : sRS.parseFactory("coffeescript", function(s, cb) {s.parsed =  CoffeeScript.compile(s.text); cb();}, defurl + "cs.js")
  };
  
  var makeModes = function (type, mode) {
    return function (s) {
      s.type = type;
      s.mode = mode;
      s.parse = parsers[type];  
    };
  };
  
  var modes = {
    js : makeModes("js", "javascript"),
    html : makeModes("html", "text/html"),
    css : makeModes("css", "text/css"),
    md : makeModes("md", "markdown"), 
    less : makeModes("less", "less"),
    jade : makeModes("jade", "text/plain"),  //need mode for jade
    jadec : makeModes("jadec", "text/plain"),
    coffeescript : makeModes("coffeescript", "text/x-coffeescript")
  };  
  
  var commenceActions;
  
  
  theme = theme || "cm-s-default";
  
  var global = SW;
  
  
  
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
  
    //calls function that parses text and then it uses a callback to execute commenceActions. This is for lazy loading of libraries such as less
    storage.parse(storage, libs, function () {
      for (i = 0; i < n; i += 1) {
        if (actions.hasOwnProperty(commands[i].command) ) {
          needy = actions[commands[i].command](storage, commands[i]) || needy; 
        } else {
          console.log("no action for command", storage.name, commands[i], storage, actions);        
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
    }); 
    

    
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
      storage.container$ = self$.parent();
      
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
      ret.name = options.slice(1);
      return ret;
    }
  } else if (options[0] !== '.' ) {
    //improve!!!
    ret.name = newName();
//    console.log("unrecognized options", options);
    return ret;
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

  var getUrl = function (storage, commands) {
    var gurl,
      url = storage.url,
      type = storage.type
    ;
      
    //if fallback html, convert to type
    
    url = url.replace(".html", "."+type);
    storage.url = url; 
    if (global.urls.hasOwnProperty(url) ) {
      gurl = global.urls[url];
      if (gurl.retrieved === true) {
        //already retrieved
        storage.text = gurl.text;
        commenceActions(storage, commands);
      } else {
        gurl.waiting.push([storage, commands]);
      }
      return ;
    } else {
      gurl = global.urls[url] = {
        retrieved : false,
        waiting : [ [storage, commands] ]
      };
    } 
    $.ajax({
      url: url,
      dataType : "text",
      success: function (data) {
        var i, n, sto, stocom;
        if (type === "html") {
          data = data.split("<!--split-->")[1];
        }
        gurl.retrieved = true;
        gurl.text = data;
        n = gurl.waiting.length;
        for (i = 0; i < n; i += 1) {
          stocom = gurl.waiting[i];
          sto = stocom[0];
          sto.text = data;  //storage objects get text as data
          sto.code$.text(data);
          sto.code$.hide();
          
          commenceActions.apply(null, stocom);
        }
        delete gurl.waiting;
      } // !!!! need error code
    });    
  };


  var runScripts = function me (options) { 
    options = options || {};
    var name, 
      blocks = global.blocks,
      urls = global.urls,
      defaults = $.extend({}, me.defaults, options.defaults),
      actions = $.extend({}, me.actions, options.actions),
      reg = options.reg ||(/^\s*\/?\/?(\w+)([^:\n\r]*)(\:|\n|\r\n|\n\r)/i)
    ;

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
        //self$.text(text);
        
        //type., actions . , name #
        type = match[1].toLowerCase();
        (modes[type] || function (storage) {
          storage.type = type;
          storage.mode = "text/plain"; 
          storage.parse = function (s, libs, cb) {
            storage.parsed = s.text; 
            cb();
          };
        }) (storage);
        
          
        storage.options = parseOptions(match[2], defaults);
        
        storage.commands = storage.options.actions;
        name = storage.name = storage.options.name;
        delete storage.options;
        
        //console.log(JSON.stringify([storage.commands, storage.name, storage.type, storage.text]))
        
        //store in blocks
        if (blocks.hasOwnProperty(name)) {
          console.log("IGNORING: name already used", name, storage, blocks[name]);
        } else {
          blocks[name] = storage;          
          storage.commenced = false;
        }
        
        
        storage.url = url = self$.attr("href"); 
        //if url, then load it. check first to see if already loaded. then use storage to run commands. add in lib command for checking
        if (url) {
          storage.isLink = true;
          storage.link$ = self$;
          self$.hide();
          if (self$.parent('div').length === 1) {
            storage.code$ = $("<code></code>");
            storage.container$.append($("<pre></pre>").append(storage.code$) );
          } else {
            storage.code$ = $("<code></code>");
            storage.container$.append(storage.code$);            
          }
          getUrl(storage, storage.commands);
        } else { //code 
          self$.html('');
          self$.addClass(theme);
          codeMirror.runMode(storage.text, storage.mode, self$[0]); 
          
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
  runScripts.defaults = {
    js : ".run.edit[.run.text].text",
    html : ".insert.hide",
    css : ".apply.hide",
    md : ".in"
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
    lib : function (storage, comobj) {
      var
        url = storage.url,
        gurl = global.urls[url]
      ;
      
      //only for external resources that should be run once
      if (gurl && (! gurl.ran) ) {
        commenceActions(storage, comobj.actions);
        gurl.ran = true;
      }
      
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
        text = storage.parsed
      ;
      if (storage.hasOwnProperty("properties") && storage.properties.hasOwnProperty("local")) {
        try {
          result = eval(text);
        } catch (e) {
          console.log(e);
          result = '';
        }          
      } else {
        try {
          result = geval(text);
        } catch (f) {
          console.log(f);
          result = '';
        }
      } 
      storage.parsed = result;
      results.push(result);
    }, 
    strict : function (storage) {
      "use strict";
       var result;
       try {
         result = eval(storage.parsed);
       } catch (e) {
         console.log(e);
         result = '';
       }
       storage.parsed = result;
       storage.results.push(result);
    },    
    reparse : function (storage) {
      storage.parse(storage, $.noop);
    },
    insert : function (storage, comobj) { //insert html
      var target$, parameters,
        text = storage.parsed
      ;
      
      
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
      var selector, cssmaps, parameters, target$, text
      ;
            
      cssmaps = cssParser(storage.parsed);

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
      var selector, cssmaps, i, n, properties, rules, strrules, rule, selectorText,
        remove = true
      ;

      
      cssmaps = cssParser(storage.parsed);

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
    show : function (storage, comobj) {
      storage.code$.show().addClass(theme);
      codeMirror.runMode(storage.text, storage.mode, storage.code$[0]); 
    },
    edit : function (storage, comobj){ //working. needs sprucing
        var actions, editor,
          mirror = $("<div class='mirror'></div>")
        ;
        storage.code$.replaceWith(mirror);
        editor = codeMirror(mirror[0], {
          value : storage.text,
          mode : storage.mode,
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
    event : function (storage, comobj) { //event[stuff to act](event1, event2,...)
      var evnt, i, evntActions,
        container$ = storage.container$,
        parameters = comobj.parameters || ["click"],
        n = parameters.length
      ;

      evntActions = function () {
        commenceActions(storage, comobj.actions); 
      };
      
      for (i = 0; i < n; i += 1){
        evnt = parameters[i];
        container$.addClass(evnt);
        container$.on(evnt+".action",  evntActions);        
      }
    },
    button : function (storage, comobj) { //button[stuff to act](text, click)
      var 
        parameters = comobj.parameters || ["Click Me"],
        text = parameters[0],
        button$ = $("<button>"+text+"</button>"),
        properties = comobj.properties || {}
      ;
      
      button$.
        on("click.action", function () {
          commenceActions(storage, comobj.actions); 
        }).
        addClass("action")
      ;
      
      storage.container$.append(button$);
      
      if (properties.hasOwnProperty("now") ) {
        commenceActions(storage, comobj.actions); 
      }
            
      if (properties.hasOwnProperty("once") ) {
        button$.on("click", function () {
          button$.remove();
        });
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
