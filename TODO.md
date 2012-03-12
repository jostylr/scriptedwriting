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

break
  
    HTML.lp= index.html : header
    
    
  
Add in code editor and make a live literate programming webappy thingy
  
Simple HTML generated website using Bootstrap using literate programming style. So as one reads, one can edit and personalize it. Start with the content and so it then compiles to something meaningful. And then step them through modifying to their own. So that the worst details are at the end where they are almost done. Have a live preview at every step so they can see their work evolve. 

js.run...#index.html : header  or _header for a function
