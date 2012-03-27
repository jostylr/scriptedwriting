Literate programming: 
  sections: /*! scope or file : name  */  replace ! with + to add to existing content, = to define the start ^ to add to beginning of content (such as a needed function in main layout)  for scope g is always global, l=name  gives default to local with that name so can ignore. l=g to return to global Each snippet should define scope or implied is global. Maybe just at top use scope, all else is defaulted to local.
  
  macros:  _macro(par1, par2, ...)  can be nested with other macros _file_macro for scoping as above. __macro is local (less likely) while _macro is global.  They are either strings (no parameters) or js functions that can operate at will.  This could allow for some more interesting build options, including using transparency to generate html, i.e., 
    _pages("about")
    could add about to the pages array in a nav link
    Then _navpages() could just run the function that will insert the stuff into navpages. 
  
    /*! index.html : header */
    <html>
      <head>
        <title = "_sitename">
      </head>

_test could be a macro used to test code:  _test([env, expected, actual]). So env deals with setup, expected is the stuff to check and actual is the corresponding. each could be an array with corresponding entries needing to be equal in some sense.  


refactor scripted to be smoother. 

  * no fencing
  * top line is what it is (JS, HTML, CSS, MD ) followed by .run.edit.clickRun.hide whatever to do the different properties.
      * .run  means run immediately
      * .edit means editable. If clickable, then edit should have a little handle on it.
      * .click means click to run it
      * .hide means hide code
      * .replace means replace code with result
      * .after means put result after the code
      * .before means put result before the code
      * .lp for literate programming. If inlined, use ; to end the header. Follow .lp with  =, +, ^ with = assumed _ for a macro
      * .toggle for toggling the code

Going to go with chaining. No defined order. 

    .run.html('div.great').edit[run.html('div.great')]

    .show.click[run.html("div.great")]

    .run.marked("container").hide

    .needs[run.text](jsxgraph, something)


So these are run in the order presented. The [] is what is to be run when the eventual action is done. That is, when someone clicks or when all dependencies have been run, ... 
  
    HTML.lp= index.html : header
    
    
  
Add in code editor and make a live literate programming webappy thingy
  
Simple HTML generated website using Bootstrap using literate programming style. So as one reads, one can edit and personalize it. Start with the content and so it then compiles to something meaningful. And then step them through modifying to their own. So that the worst details are at the end where they are almost done. Have a live preview at every step so they can see their work evolve. 

js.run...#index.html : header  or _header for a function

incorporate less: [so jrburke](http://stackoverflow.com/questions/5889901/requirejs-and-less)
(new less.Parser()).parse(lessText, function (err, css) {
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


geval, plugin for more behaviors, figure out whether results should be or not, literate programming

_n("name here")  inserting named section
_t(setup, expected, actual)  testing sample

name parsing: folder/file/part  with a possible + at the beginning or end to indicate adding to another bit

var  just, undefined, variables,
  assignedVar = "whatever",
  another = [great, job]
;

split text into new lines to begin with. helps with line counts 
at top of a block.
if "var" at beginning, then go into chunking. 
First line: grab stuff until ,  then new var, new var, ...  until \n
after, one var per line with =    name = whatever possibly check if last character is a comma (\n already split away)
then ; 

With vars in hand, one can create super var list at top of enclosing scope (function top)

.toggle[1("Hide Code", "gold.great",)[hide].2("Show Code")[show]].hide

.toggle(first, second.classy, third)[1("Edit", "gold", "wideButton")[edit[]].2[run].3[hide]]

so the parameters are the names and class of the buttons. The o[] are the actions to be taken, paired in correspondence to position. 

defaults for each type

.view[2{row2}[reset].3[run]]

relocate stuff to SW object so that it can all be modified from the page itself!

