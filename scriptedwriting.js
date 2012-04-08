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

var root = this; // place to put stuff 


var SW = {};

SW.Blocks = function () {};

//need indent.
SW.Blocks.prototype._vh = {
  fun : function () {
    var indent, str, match, 
    s = this
    ;
    
    s.macrocbs.push(["vh:"+s.name, function () {
      
      match = s.text.match(/^(\s+)var\;/m);
      if (match) {
        indent = match[1];
      } else {
        indent = '';
      }
      str = ',\n'+indent+'  ';
      s.text = s.text.replace("var;", "var" + indent + '  ' + s.vars.join(str) + "\n"+indent+";");
      
      console.log(s.text, s.vars, s.name)
    }, [] ]);
    
    console.log("vh", arguments)
    
    return "var;";
  }
};

SW.Blocks.prototype._var = {
  fun : function () {
    var v, i, 
      n = arguments.length,
      s = this
    ;
    
    if (! s.hasOwnProperty("vars") ) {
      s.vars = [];
    }
    
    v = s.vars;
    
    for (i = 0; i < n; i += 1){
      v.push(arguments[i].trim());
    }
    console.log("var", JSON.stringify(v), s.name);
    return "";
  }
};

SW.lint = {asi:true}

SW.global = {
  blocks : new SW.Blocks(), //storage objects by name from runscripts
  needs : {},  // stuff that needs the key
  urls : {} //urls loaded, e.g., jsxgraph  
};

SW.maxCompTime = 100; 

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
var setupRunScripts = function sRS ($, codeMirror, JSHINT, theme, defurl) {
  
  
  var libs = {
    loaded : {},
    loading : {}
  };
  
  defurl = defurl || "vendor/";
  
  var hideCode = function (storage) {
    if (storage.inline) {
      storage.code$.hide();
    } else {
      storage.code$.parent().hide();
    }
    
  };
  
  var parseFactory;
  
  // this is mental. creates a function that loads up a script and grabs that external function and uses it to run
  parseFactory = sRS.parseFactory = function (type, command, url, setup) {
    return function (storage, libs, cb) {
      if (libs[type] ) {
        command(storage, cb); 
      } else {
        if (libs.loaded[url]) {
          if (setup) {
            setup();
          }
          libs[type] = command;
          command(storage, cb);
        } else if (libs.loading.hasOwnProperty(url) ) {
          libs.loading[url].push([storage, cb, type, command, setup]);
        } else {
          libs.loading[url] = [[storage, cb, type, command, setup]];
          $.ajax({
            url: url,
            dataType : "script",
            success: function () {
              var i, temp,
                toLoad = libs.loading[url],
                n = toLoad.length
              ;
              libs[type] = command;
              for (i = 0; i < n; i += 1) {
                temp = libs.loading[url][i];
                if (temp[4]) {
                  temp[4]();
                }
                
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
      storage.result = storage.parsed = storage.text;
      cb();
    }, 
    css : function (storage, libs, cb) {
      storage.result = storage.parsed = storage.text;
      cb();
    },
    md : sRS.parseFactory("md", function (s, cb) {s.result = s.parsed = marked(s.text); cb(); }, defurl + "marking.js"),
    less : sRS.parseFactory("less", function (s, cb) {s.result = s.parsed = less.sw(s.text); cb();}, defurl + "less.js", 
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
    jade : sRS.parseFactory("jade", function (s, cb) {s.result =  s.parsed =  jade.compile(s.text)();  cb();}, defurl + "jade.js"),
    jadec : sRS.parseFactory("jadec", function(s, cb) {SW.jade[s.name] = s.parsed =  jade.compile(s.text); cb();}, defurl + "jade.js", 
      function () {
        SW.jade = {}; // store compiled in here
      }),
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
  
  var global = SW.global;
  
  var blocks = global.blocks;
  
  var maxCompTime = SW.maxCompTime;
  
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

  var nameChange = function (name) {
    
    if (blocks.hasOwnProperty(name)) {
      if (blocks[name].nameCounter) {
        blocks[name].nameCounter += 1;
        name = name + blocks[name].nameCounter;
      } else {
        blocks[name].nameCounter = 1;
        name = name + 1;
      }
    } 
    return name;
  };
    
  var manageName = function (storage, name) {
    var def, t;
    if (name === "=") { // defines default to add to for short things
      name = newName();
      storage.name = name;
      global.defaultStorage = storage;
    } else if (name === "+="){ //pre add to default
      name = newName();
      def = global.defaultStorage;
      if (def) {
        def.texts.unshift([name, storage.text, storage]);
        def.text = storage.text + "\n" + def.text;
      }   else {
          console.log("ignoring =+", storage);
        }
    } else  if (name === "=+") { // post add to default
      name = newName();
      def = global.defaultStorage;
      if (def) {
          def.texts.push([name, storage.text, storage]);
          def.text = def.text + "\n" + storage.text; 
      } else {
        console.log("ignoring =+", storage);
      }
    } else if (name[0] === "+") {
      name = name.slice(1);
      //add block before content
      t = blocks[name];
      name = nameChange(name); 
      if (t) {
        t.texts.unshift([name, storage.text, storage]);
        t.text = storage.text + "\n" + t.text;
      } else {
        console.log("ignoring +"+ name, storage);
      }
    } else if (name[name.length-1] === "+"){  //post add
      //add bloack after content
       name = name.slice(0,-1);
       //add block before content
       t = blocks[name];
       name = nameChange(name); 
       if (t) {
         t.texts.push([name, storage.text, storage]);
         t.text = t.text + "\n" + storage.text;
       } else {
         console.log("ignoring +"+ name, storage);
       }
      
    } else if (blocks.hasOwnProperty(name)) { //repeat with no adding
      console.log("repeated name, overwriting", name, storage);
    } else if (name[name.length-1] === "=") { // make local
      global.defaultStorage = storage;
      name = name.slice(0, -1);
      if (blocks.hasOwnProperty(name)) { //repeat with no adding
        console.log("repeated name, overwriting", name, storage);
      }
    }
    
    storage.name = name;
    blocks[name] = storage;          
    
  };
  
  // callback:  [identifier for failure, function cb, data as args array]
  var macroCallbacks = function (s) {
    var i, 
      cbs = s.macrocbs,
      n = cbs.length
    ; 
    
    for (i = 0; i < n; i += 1) {
      try {
        cbs[i][1].apply(s, cbs[i][2]);  // s is this in the callbacks
      } catch (e) {
        console.log("callback failure", e, s.macrocbs[i][0], s);
      }
    }
  };
  
  var macroEval = function (s, macro) {
    var i, cur, m, f,
      args = [],
      name = macro[0],
      n = macro.length
    ;
    
    try {
      m = blocks[name];
      
      if (m) {
        
        /*
        //macro[1]... are the arguments
        for (i = 1; i < n; i += 1) {
          args.push(eval(macro[i]));
        }
        
        console.log(args, m)
        */
        
        f = m.fun;
        if (!f)  {
          f = m.fun = eval(m.text);
        }
                
        return f.apply(s, macro.slice(1)); //storage is this
        
      } else {
        console.log("no such macro", macro, s);
        return "";
      }
      
      
      
    } catch (e) {
      console.log("macro eval failed", e, macro);
      return "";
    }
    
  };
  
  var macrosub = function( text, s ) {
    var i, curLetter, mode, start, curMacro, name, curArg, tail, end, match,
      modes = [],
      args = [], 
      curText = [],
      texts = [curText],
      n = text.length,
      startSep = "_",
      argsStart = "(",
      endSep = ")",
      argSep = ",",
      macros = []
    ;
    
    mode = "top";
    
    var macroName = function () {
      if ( (text[i+1] === "'" ) || (text[i+1] === '"') )  { 
        tail = text.slice(i+2);
        end = tail.indexOf(text[i+1]); //same quote
        if (end === -1) {
          console.log("unterminated quote", tail);
          curText.push(curLetter);
        } else {
          name = "_" + tail.slice(0, end);
          i += end + 3;
          // pure names have been read so there should be a parentheses
        }
      } else if ( (i === 0) || (text[i-1].match(/\s/)) ) {
        tail = text.slice(i);
        match = tail.match(/^(_\w+)\(/);
        if (match) {
          name = match[1];
          i += name.length; // i is pointing to after the string thanks to adding _
        } else { //escaping _dude() when meant as javascript, not macro. escape as _dude\()
          match = tail.match(/^(_\w+)\\\(/);
          if (match) {
            curText.push(match[1]+"(");
            i += match[1].length-1;
          } else {
            curText.push(curLetter);
          }
        }
      } else {
        curText.push(curLetter);
        return;
      }
      
      if (text.slice(i, i+2) === "()") {
        curText.push(macroEval(s, [name]) );
        i += 1;
      } else if (text[i] === "(") { //get ready for arguments
        curMacro = [name];
        texts.push(curText);
        curText = []; //text of argument
        modes.push(mode);
        mode = "argument";
      } else {
        console.log("problem",  i, text);
        curText.push(name);
      }
      
    };
    
    
    //_"macro"(3#)
    for (i = 0; i < n; i+=1 ) {
      curLetter = text[i];
      if (mode !== "top") {
        //console.log(curLetter, mode, modes, curText.join(""), curMacro.join(""), macros, texts)
      }
      switch (mode) {
        case "top" :
          if (curLetter === startSep) {
            macroName();
          } else {
            curText.push(curLetter);
          }// otherwise move on
        break; 
        case "argument" :  //in here, this should be js. At top, could be any language
          switch (curLetter) {          
            case argSep :
              curMacro.push(curText.join(''));
              curText = [];                
            break;
            case endSep : 
              i += 1;
              curMacro.push(curText.join(''));
              curText = texts.pop();
              curText.push(macroEval(s, curMacro) );
              curMacro = macros.pop();
              mode = modes.pop();
            break;
            case startSep : 
              macroName();
            break;
            case "'" : 
            case '"' :
            case "/" : //for regex support. Maybe comments could be /*   */ with no slashes in them. try not to use them
              tail = text.slice(i+1);
              end = tail.indexOf(curLetter);
              if (end === -1) {
                console.log("unterminated quote", tail);
                curText.push(curLetter);
              } else {
                curText.push(curLetter+tail.slice(0, end+1));
                i += end + 1;
              }
            break;            
            case "(" :
            case "[" :
            case "{" :
              curText.push(curLetter);
              modes.push(mode);
              mode = "par";
            break; //parentheses
            default : 
              //add to current argument
              curText.push(curLetter);
            break;
          }
        break; //argument
        case "par" : //don't care about matching, just stopping the enclosing brackets
          switch (curLetter) {
            case ")" :
            case "}" :
            case "]" :
              curText.push(curLetter);
              mode = modes.pop();
            break;
            case startSep : 
              macroName();
            break;
            default : 
              curText.push(curLetter);
            break;
          }
        break;
      }
    }
    return curText.join('');
    
  };
  
  
  //the name functionality should already be done and added pieces together.
  //this part compiles in the macro stuff, inserting pieces, etc., 
  var compile = function compile (arr) {
    var compiled, i, s, t, 
      n = arr.length,
      reg = /([ \t]*)\_(?:\"([^"]+)\"|\'([^']+)\')[^(]/g //whitespace checker in beginning could be bad for speed. 
    ;
    
    var replacef = function (sub, indent, subd, subs, start, str) {
      var requested
      ;
      if (subd) {
        requested = subd;
      } else {
        requested = subs;
      }
      if (global.blocks.hasOwnProperty(requested) ) {
        t = global.blocks[requested];
        if (t.compiled) {
          if (t.hasOwnProperty("vars")) { //extend to more functional
            if (! s.hasOwnProperty("vars")) {
              s.vars = [];
            } 
            s.vars = s.vars.concat(t.vars);
          }
          return t.text.replace("\n", "\n" + indent);          
        } else {
          if (compiled) { // only add to one outstanding need
            compiled = false;
            t.toBeCompiled.push(s);  // when t is compiled, s will be compiled again, maybe            
          }
          return sub; // do not replace. wait for compiling
        }
      } else { // all names are already claimed so this means can't use
        console.log("no such block", requested, s);
        return ""; //should make this changeable. This just deletes the bit
      }
    };
    
    for (i = 0; i < n; i += 1) {
      s = arr[i];
      if (s.compiled) {
        continue; //done with it. needed for idempotency in calling compile repeatedly
      }
      if (s.compTimes >= maxCompTime) { //attempt to avoid infinite loop
        continue;
      } else {
        s.compTimes += 1;
      }
      
      //parse through looking for matches to substitute
      // do _n first. these are the substitutions:  _n#name#   this is so that one can use them in other macros too! GHY
      compiled = true;
      //replaces all names in the function 
      s.text = s.text.replace(reg, replacef);
            
      if (compiled) {
        s.compiled = true;
        //then do the other macro substitutions
        s.text = macrosub(s.text, s);
        //then run through any that depend on this being compiled
        compile(s.toBeCompiled);
        s.toBeCompiled = []; //clear it
        // run any callbacks generated by macros
        macroCallbacks(s);
        //now do actions
        commenceActions(s, s.commands);
      } 
      
    }
    
    
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
  

  if (!options) {
    options = defaults;
  }
  
  
  //parse it a character at a time
  options = options.trim();
  n = options.length;
  ret =  {actions : []};
  parents = [];
  if (options[0] === '#' ) {
    console.log("name only", options);
    ret.name = options.slice(1);      
    return ret;
  } else if (options[0] !== '.' ) { 
    //improve!!!
    ret.name = newName();
    console.log("unrecognized options", options);
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
          hideCode(storage);
          
          commenceActions.apply(null, stocom);
        }
        delete gurl.waiting;
      } // !!!! need error code
    });    
  };


  var runScripts = function me (options) { 
    options = options || {};
    var name, 
      toCompile = [],
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
          results : [],
          //compile vars
          toBeCompiled : [],
          compiled : false,
          compTimes : 0,
          macrocbs : []
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
        
          
        storage.options = parseOptions(match[2], defaults[type]);
        
        storage.commands = storage.options.actions;
        name = storage.name = storage.options.name;
        storage.texts = [[name, storage.text, storage]];
        delete storage.options;
        
        //console.log(JSON.stringify([storage.commands, storage.name, storage.type, storage.text]))
        
        //store in blocks
        manageName(storage, name);
        
        storage.commenced = false;
        
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
          
          toCompile.push(storage);
          //commenceActions(storage, storage.commands);
                    
        }
      }
    });
    compile(toCompile);
    return this;
  };


  // defaults need to be type based
  //default is to run the code snippet, make it editable, append each of the results, and give it no name
  runScripts.defaults = {
    js : ".run.edit[run.text].text",
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
    lint : function (storage, comobj) {
      JSHINT(storage.parsed, SW.lint)
      var report = JSHINT.report()
        , type
        
      if (comobj.parameters) {
        type = parameters[1] || "html"
        $(comobj.paramteters[0])[type](report)
      } else {
        if (storage.lint$) {
          storage.lint$.html(report)
        } else {
          storage.lint$ = $("<div class='hint'></div>")
          storage.lint$.html(report)
          storage.lint$
            .click(function () {$(this).hide()})
            .show()
          storage.container$.append(storage.lint$)
        }
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
      storage.result = result;
      results.push(result);
    },
    fun : function (storage, comobj) {
      var name, 
        obj = root,
        parameters = storage.parameters,
        properties = storage.properties
      ;
      if (parameters) {
        name = parameters[0];
      } else {
        name = storage.name;
      }
      if (properties) {
        if (properties.hasOwnProperty("SW")) {
          obj = SW;
        } else if (properties.hasOwnProperty("fun")){
          obj = SW.fun;
        } else {
          obj = root;
        }
      }
      try {
        obj[name] = geval(storage.text);
      } catch (f) {
        console.log("fun error", f, storage, comobj );
        obj[name] = function () {};
      }  
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
       storage.result = result;
       storage.results.push(result);
    },    
    reparse : function (storage) {
      storage.parse(storage, $.noop);
    },
    insert : function (storage, comobj) { //insert html
      var target$, parameters,
        text = storage.result
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
            
      cssmaps = cssParser(storage.result);

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

      
      cssmaps = cssParser(storage.result);

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
      hideCode(storage);
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
    // this creates panes for text, parsed, results, whatevr
    // row id.class.class  col1  col2  ...; row ...
    // .view("first.row .span4 .span4 .span4", "second.row .span4")[s{edit/html/text/code}("property", "name")[actions to run before].result.act("temp")[run.results]]
    view : function (storage, comobj) {
      var i, n, ii, nn, row, row$, col$,  col, id, action, other, s, key, toGet, properties, pre$, code$, 
        actionCount = 0,
        actions = comobj.actions,
        container$ = storage.container$,
        rows = comobj.parameters || [],
        layout = storage.layout || {},
        name = storage.name
      ;
      
      if (rows.length === 0) {
        console.log("no rows in view", storage, comobj);
      }
      
      //hide default pre box
      hideCode(storage);
      
      storage.layout = {};
    
      var idclassify = function (elem$, str) {
        var idclass, classes
        ;
        if (!str) {
          return ;
        }
        
        idclass = str.split('.');
        if (idclass[0]) {
          elem$.attr("id", name+"_"+idclass[0]);
          layout[id] = elem$; 
        }
        
        if (idclass.length > 1) {
          classes = idclass.slice(1).join(" ");
          elem$.addClass(classes);
        }
        
      };

      n = rows.length;
      //parse rows and create them in container$
      for (i = 0; i < n; i += 1) {
        row = rows[i].split(/\s+/);
        // row[0] is top container's info
        row$ = $("<div></div>");
        layout[i] = row$;
        idclassify(row$, row[0]);
        container$.append(row$);
        //loop through rest
        nn = row.length;
        for (ii = 1; ii < nn; ii += 1) {
          col$ = $("<div></div>");
          layout[i+","+"ii"] = col$;
          idclassify(col$, row[ii]);
          row$.append(col$);
          //add in action stuff
          action = actions[actionCount];
          actionCount += 1;
          if (!action){
            continue;
          }
          if (action.command === "s") {
            if (action.parameters) {
              other = action.parameters[1];
              if (other) {
                s = global.blocks[other]; 
                if (!s) {
                  console.log("no such object", other, storage, action, comobj);
                  continue;
                }
              } else {
                s = storage;
              }
              toGet = action.parameters[0] || "text";
            } else {
              s = storage;
              toGet = "text";
            }
            if (action.actions) {
              commenceActions(s, action.actions);
            }
            
            properties = action.properties || {};
            console.log(s[toGet], s.name);
            if (properties.hasOwnProperty("edit")){
              
            } else if (properties.hasOwnProperty("html")){
              col$.html(s[toGet]);
            } else if (properties.hasOwnProperty("code")){
              pre$ = $("<pre><code></code></pre>");
              code$ = pre$.find('code').addClass(theme);
              
              codeMirror.runMode(s[toGet], s.mode, code$[0]); 
              col$.html(pre$);
            } else if (properties.hasOwnProperty("text")){
              col$.text(s[toGet]);
            } else {
              col$.text(s[toGet]);
            }
          } else {
            ii -= 1; //dangerous, but actionCount should break it if need be. This is to allow for prep actions. only s. adds stuff
            commenceActions(storage, [action]);
          }
          
        }
      }
      
      
      //go through actions and insert into row,col
      
      
      
      
    }, 
    //.toggle[1("Hide Code", "gold.great",)[hide].2("Show Code")[show]].hide
    toggle : function (storage, comobj){  //done
      var i, temp$,
        counter = 0,
        actions = comobj.actions || [],
        max = actions.length,
        container$ = storage.container$,
        buttons = []
      ;
            
      if (actions.length === 0) {
        console.log("no button info", storage, comobj);
        return ;
      }
            
      var makeButton = function (actobj) {
        // parameters: button text, id.class1.class2 || .class1.class2, placement
        var i, n, classes,
          parameters = actobj.parameters || [],
          button$ = $("<button></button>")
        ;
        
        if (parameters.length === 0) {
          button$.text("Blank");  
        } else {
          button$.text(parameters[0]);
        }
        
        //classes
        if (parameters[1] & parameters[1] !== "null") {
          classes = parameters[1].split(".");
          n = classes.length;
          if (classes[0]) {
            button$.attr("id", classes[0]);
          }
          for (i = 1; i < n; i += 1) {
            button$.addClass(classes[i].trim() );
          }
        }
        button$.on("click", function () {
          commenceActions(storage, actobj.actions);
          button$.hide();
          counter += 1;
          if (counter >= max) {
            counter = 0;
          }
          buttons[counter].show();
        });
        
        if (parameters[2] & parameters[2] !== "null") {
          storage.layout[parameters[2]].append(button$);
        } else {
          container$.append(button$);
          container$.append(button$);
          buttons.push(button$);
        }
        return button$;    
      };
  
      for (i = 0; i < max; i += 1) {
        temp$ = makeButton(actions[i]);
        if (i !== 0) {
          temp$.hide();
        }
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
