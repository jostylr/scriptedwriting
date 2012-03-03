
(function () {
  
  var count = 0;
  
  
  $("#clicker").click(function () {
    $("#increment").text(count);
    count += 1;
  }).click();
  
}());