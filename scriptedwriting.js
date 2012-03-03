/*globals $, runScripts, console*/


//anon for local closure
(function () {
  
  var runreg = /^\/?\/?RUN\:/i;
  var clickreg = /^\/?\/?CLICK\:/i;
  

  runScripts = function () {
    var code, url, text;
    $('code, a').each(function () {
      var self = $(this);
      if (self.hasClass("run") ) { //code snippet with class run
        eval(self.text());
        self.addClass("javascript").removeClass("run");
      } else if (self.hasClass("click") ) { //code snippet with class click
          //click to run
          text = self.text();
          self.click((function () {
            var t = text;
            return function () {
              eval(t);
            }; 
          } () )  );
          self.addClass("javascript").removeClass("click");
      }
      else if (self.attr("href") && self.text().match(runreg)) { //link
        url = self.attr("href").replace(".html", ".js");
        $.ajax({
          url: url,
          dataType : "script",
          success: (function () {
            var s = self;
            return function () {
              s.hide();
          };
        } () )
        });
      }  else if (self.attr("href") && self.text().match(clickreg)) { //link
          url = self.attr("href"); //
          $.ajax({
            url: url,
            dataType : "text",
            success: (function () {
              var s = self;
              return function (data) {
                var chunk;
                chunk = data.split("<!--split-->")[1];
                s.replaceWith(chunk);
                $.ajax({
                  url : url.replace(".html", ".js"),
                  dataType: "script"
                });
              };
            } () )
          });
      } else if (self.text().match(clickreg) ) {
        text = self.text().replace(clickreg, '');
        self.click((function () {
          var t = text;
          return function () {
            eval(t);
          };} ())
        );
      }
    });
  };


  
}());

