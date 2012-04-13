# Building the Scripted Writing Editing Toggles

The goal of this is to create an editing environment. We wish to use the browser as editor with:

1. Edit all MD. This is easy, we just use CodeMirror and the markdown text.
2. Edit sections. A section is defined as between two headers of equal importance or the second one is greater. So h2 to h1 is a section, but h1 to h2 is not. Each section can be edited as markdown and then when saved, its state is put back into the original markdown text and all of it is reprocessed? 
3. Edit code. The code just sits there in CodeMirror editors. When told to save, it updates as in case 2.
4. No editing of the source code. The various views of the code may allow editing, but this is the "final" view; no saving.

Saving to disk is a separate action? Anyway, the full MD text and its file name is sent as JSON to a Node instance and it overwrites the files. Maybe setup a github trigger. Then the page can also refresh as node will serve up the page. 

## Node Scheme

Get JSON, store it. Get request for *.md, send file with .md content in textarea surrounded by default stuff. Automatically marked up by browser.

    js#node server
    _vh()
    
    _vars(connect = require('connect));
    
    _"load templates"
    
    _"define factories"
        
    var app = connect()
      .use(connect.logger)
      .use(connect.json)
      .use(connect.static(__dirname+'/vendor'))
      .use(
        _"save or get"
      )
      .listen(3000)
    ;
    
    
### Load the templates

So we read from disk the basic template. It should have `<!--split-->` for splitting in two where we inject the markdown.

    js#load templates
    _vars(fs = require('fs'))
    var template = fs.readFileSync("template.html", 'utf8');
    template = template.split('<!--split-->');
    
    

### Main router

So we need a function that will route the requests properly and initiate the proper calls

    js#save or get
    function(req, res, next) {
      _vh()
      
      _vars(edit, file, md, page)
      
      _"parse request"
      
      if (edit) {
        path.exists(req.body.fname, saveFactory(req, res));
      } else if (md) {
        fs.readFile(file, 'utf8', sendMdFactory(req, res));
      } else if (page) {
        fs.readFile(file, 'utf8', sendPageFactory(req, res, ext));
      }
    }

And now for the main event, the parsing of the request. First we check for an edit request which just is something that ends in edit. After that we try to match /dir/.../dir//name.md where dir and name may vary. This match gets routed to md. Failing that, we check for /dir/name/files.html|css|js 


And now the code

    js#parse request
    if (req.url.match(/edit^/) ) {
      if (req.body.fname && req.body.file) {
        edit = true;
      } else {
        res.end("incomplete edit request");
      }
    } else {
      _vars(match)
      match = req.url.match(/((?:\/\w+)+\/\w+\.md)^/);
      if (match) {
        md = true;
        file = __dirname + match[1];
      } else {
        match = req.url.match(/((?:\/\w+)+\/\w+\.(html|css|js))^/);
        if (match) {
          page = true;
          file = match[1];
          ext = match[2];
        } else {
          req.url.res.end("request not understood");          
        }
      }
    }

### Factories

A list of the factory functions for responding to requests.

    js#define factories
    _"save incoming factory"
    
    _"send md factory"
    
    _"send page factory"
    

The markdown files are read async. So this defines the callback function which will take the text and assemble it and the send it on its way. To get req and/or res, we use a factory function. Need a better pattern.    

#### Assemble template  

Template is a global that holds the one-time loaded template for snapping together once the markdown is loaded into data.

    js#send md factory
    sendMdFactory = function (req, res) {
      return function (err, data) {
        _"smdf error"
        
        response.writeHead(200, { 'Content-Type': 'html' })
        res.end(template[0] + data + template[1])
      }
    };

And the error bit: 

    js#smdf error
     if (err) {
        console.log(err)
        res.end("file not found")
        return 
      }
    
#### Send a page

    This is for sending a generated file
    
    sendPageFactory = function (req, res) {
      _"smd"
    }
    
    html : ["text/html", "utf8"],
    css : ["text/css", "utf8"],
    js : ["text/javascript","utf8"],
    
#### Save the incoming

Save markdown to filename. Have optional overwrite to overwrite the file. This could be enabled by default on page load of that file, but not for new files or change of filename. Seems no error in path.exists. Also create/save into directories for any compiled page files. 

    js#save incoming factory
    _vars(path = require('path'))
    saveFactory = function (req, res) {
      return function (exists) {
        _"sif not exists"
        fs.writeFile(req.body.fname, req.body.file, 'utf8', function () {
          res.end("file " + req.body.fname +" saved")
        })
        _vars(comp, key)
        comp = req.body.compiled
        if (comp) {
          for (key in comp) {
            //should deal with directory creating. later
            fs.writeFile(comp[key].fname, comp[key].file, 'utf8')
          }
        }
      }
    }
    
And the not exists part:

    js#sif not exists
    if (exists && !req.body.overwrite) {
      res.end("file exists and no overwrite command")
      return 
    }



### Run in node

Need to add a way to test and run Node code from browser via the node. Later.

## Browser scheme

Upon marking, each header and code token is special, as denoted by the presence of an `original` property in the token. The original is the original text in the source to enable finding. 

The code original can be used directly to replace the original with the modified.

The header code is a boundary finder. So one needs to find the index of its starting point and the next relevant section and then use subtring() + new stuff + substring.

Have edit mode, full edit, and preview.  Edit mode should have icons on each section for editing plus an icon for full editing, floating at top right. Tabbing should go from one section to the next. Not sure if one could do numbering or something to go back and forth. 

Tabbing out of an edit window saves state, refreshes. Need to make sure it doesn't reset browser positions.


### Divving the Marked tokens

For marked, get tokens via .lexer(src). Go through each token, demarcating the boundaries. Parse each subsection, wrap it in an appropriate div, and then get that inserted in to the token stream. 

    js#div the tokens
    divToke = function (text) {
      var tokens
        , i
        , n
        , originals = {}
        , parts = []
      
      starts = [[0,0]]
      idcount = 1
      tokens = marked.lexer(text)
      str = ''
      n = tokens.length
      for (i = 0; i < n; i += 1) {
        toke = tokens[i]
        if (toke.hasOwnProperty("original")) {
          if (toke.type === "code") {
            //parse it
            tokens[i] = {
                type : "pass"
              , text : '<div id' + '="md' + idcount + '" class="editable code">' + marked.parser([toke]) + '</div>'
            } 
            originals["md"+idcount] = toke.original
            idcount += 1
          } else if (toke.type === "heading") {
            _"head sectioning"
          } else {
            console.log("did not recognize type", toke)
          }
        } //no action here
      }
      //close it up
      
      

      str = '<div id="full">' +  str + '</div>';
    }

Computing the heading craziness. If the heading depth is smaller, close them all up until you reach one of greater level. Then stop. If the heading level is the same, close the current one, pop on new one.

    js#head sectioning
    last = starts[starts.length-1];
    if (toke.depth < last[1] ) {
      //pop off until you get to >= 
    } else if (toke.depth === last[1]){ 
      '<div id' + '="md' + idcount + '" class="editable">' + marked.parser(tokens.slice(last[0], last[1] ) ) + '</div>';
      originals["md"+idcount] = toke.original;
      
    } else { // new level
      
    }
    
    



### Modifications in marked    

Modified marked to have original text in the properties. 

    js#marked mods block parsing
    // code
    if (cap = block.code.exec(src)) { 
      original = cap[0];  //JT
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      tokens.push({
        type: 'code',
        text: !options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap,
        original : original  //JT
      });
      continue;
    }

    // fences (gfm)
    if (cap = block.fences.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'code',
        lang: cap[1],
        text: cap[2]
      });
      continue;
    }

    // heading
    if (cap = block.heading.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2],
        original : cap[0] //JT
      });
      continue;
    }

    // lheading
    if (cap = block.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1],
        original : cap[0] //JT
      });
      continue;
    }
    
And later in the parser

    js#marked mods parser passing
    case 'pass' : {
      return token.text;
    }


## Eventually but soon

tests, logging. 