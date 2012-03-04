/*globals $, runScripts, console*/


//anon for local closure
(function () {
  
  var modes = {
    run : {  // run the code and hide it
      code: function (self, cl, text) {
        eval(text);
        if (cl) {
          self.removeClass(cl);
        }        
      }, 
      a : function (self, url) {
        url = url.replace(".html", ".js");
        $.ajax({
          url: url,
          dataType : "script",
          success: function () {
              self.hide();
          }
        });
      }
    },
    show : {  // run the code and display it, using result as title
    },
    click : { // make the code clickable to run
      code: function (self, cl, text) { 
        self.click(function () {
          eval(text);
        } );
        if (cl) {
           self.removeClass(cl);
         }        
       },
       a : function (self, url) {
         $.ajax({
           url: url,
           dataType : "text",
           success: function (data) {
             var chunk;
             chunk = data.split("<!--split-->")[1];
             self.replaceWith(chunk);
             $.ajax({
                url : url.replace(".html", ".js"),
                dataType: "script"
              });
           }
         });
       }       
    },
    replace : { // run the code and use the result to replace the code snippet
    },
    add : { //run the code and place result after it
    },
    insert : {  //insert some html
    },
    lp : { //a literate programming snippet
      
    }
  };

  var reg = /^\/?\/?(run|show|click|replace|add|insert|part)\:?/i;
  

  runScripts = function () {
    var url, text, cl, match, type;
    $('code, a').each(function () {
      var self = $(this);
      cl = self.attr('class');
      text = self.text();
      match = reg.exec(cl) || reg.exec(text);
      if (match) {
        type = match[1].toLowerCase();
        url = self.attr("href"); 
        if (url) {
          modes[type].a(self, url, text);
        } else { //code 
          modes[type].code(self, cl, text);
        }
      }
    });
};


  
}());

