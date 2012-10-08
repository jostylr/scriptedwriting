Each Scripted Writing document is a markdown document but with added instructions for more functionality when run in the SW environment.

## Coding

Code can be loaded/run/... by including a line with a special syntax, which below I will abbreviate as `sw.#`

* Code block. Indent the block. On the first line, use `sw.#`
  Optional is `//sw.#:`
* Link:  `[sw.#: descriptive text](url to resource)`
* Inline code: 

    `sw.#: 3+4`

## Types

Replace the sw in the syntax above with the following default types or add your own: 
* js JavaScript
* html 
* css
* less [compiles to css](http://lesscss.org/)
* md [markdown, compiles to html](http://daringfireball.net/projects/markdown/)
* jade [templating, compiles to html](http://jade-lang.com/)
* coffeescript [compiles to js](http://coffeescript.org/)

### Adding your own

## Actions

The `.` part of the syntax is a series of `.` such as in chaining. Order of the dotted terms is significant. It flows 
  
    sw.action1{flag1, flag2, ...}(parameter1, parameter2, ...)[actionA.actionB].action2...

Example: `js.needs(firstPrimes, printPrimes)[run.insert.edit[]]#main` means that the block is a JavaScript block. Before running it needs `firstPrimes` and `printPrimes` to have been run. Once that is true, then the actions will be taken:

1. Run. The code is executed. The results of the last evaluated statement becomes the return text. 
2. Insert. Put the return text after the code block. Note the text is treated as html be default.
3. Edit[]. The code block is made editable. When the Apply button is clicked, it will do run.insert,  replacing what was there before.

### List of actions



## Snippets

At the end of each intro line, one can have an id tag, `#`. Whatever appears after that (until newline or `:`), will become the name of the block. Probably best to avoid punctation such as quotes and commas. And, obviously, the colon.

One can insert a block named "Name this block" by using `_"Name this block"`  

There is another use for `_`.  It can also do macro functionality. In particular, one can define a snippet to be a JavaScript function that can take in arguments and do something in the compile phase.

Uses might include `_vars` to put vars at the top of a block, `_test` to have test code placed where needed, `_log` or `_debug` for debugging purposes.


## Digging in

`SW` is the single global added. `new SW()` creates a new Scripted Writing block? 

### SW.Blocks

SW.Blocks creates a new storage object for storing snippets by name. There are some macros that are there by default: 

* `_vh` which takes no arguments. It will place all the vars statements at that location that have accumulated in the snippet and its children.
* `_var` each argument is a variable declaration, either an assignment or just a name. 


