/*globals $, runScripts, console, marked*/


//anon for local closure
(function () {

  var reg = /^\s*\/?\/?(run|show|click|replace|add|insert|\/\*\!)\:?/i;

  var modes = {
    run : {  // run the code and hide it
      code: function (self, cl, text) {
        eval(text);
        if (cl) {
          self.removeClass(cl);
        }
        self.hide();        
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
      code: function (self, cl, text) {
        var result = eval(text);
        self.attr("title", JSON.stringify(result) );
      }, 
      a : function (self, url) {
        url = url.replace(".html", ".js");
        $.ajax({
          url: url,
          dataType : "script",
          success: function (data) {
            self.attr("title", data );
          }
        });
      }
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
         self.click(function (event) {
           event.preventDefault();
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
         });
         return false;
       }
    },
    replace : { // run the code and use the result to replace the code snippet
      code: function (self, cl, text) {
        var result = eval(text);
        self.replaceWith(marked(result+ '') );
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
    add : { //run the code and place result after it
        code: function (self, cl, text) {
          var result = eval(text);
          if (self.parent().is('pre') ) {
            //block
            self.after(marked(result+ '') );
          } else {
            self.text(text);
            self.after(' == ' + result); // inline
          }
        }, 
        a : function (self, url) {
            $.ajax({
              url: url,
              dataType : "text",
              success: function (data) {
                var chunk;
                chunk = data.split("<!--split-->")[1];
                self.after(chunk);
                $.ajax({
                   url : url.replace(".html", ".js"),
                   dataType: "script"
                 });
              }
            });
        }       
    },
    insert : {  //insert some html
      code : function (self, cl, text) {
        self.replaceWith(text);
      },
      a : function (self, url) {
        $.ajax({
          url: url,
          dataType : "text",
          success: function (data) {
            var chunk;
            chunk = data.split("<!--split-->")[1];
            self.replaceWith(chunk);
          }
        });
      }
    },
    "/*!" : { //a literate programming snippet
      code : function (self, cl, text) {
        console.log("Literate programming!");
      },
      a : function (self, url, text) {
        
      }
    }
  };

  

  runScripts = function () {
    var url, text, cl, match, type;
    $('code, a').each(function () {
      var self = $(this);
      cl = self.attr('class');
      text = self.text();
      match = reg.exec(cl) || reg.exec(text);
      if (match) {
        text = text.replace(reg, '');
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

