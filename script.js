(function() {
   $(".grid").height($(window).height());

   var contents = $("iframe").contents(),
       body = contents.find("body"),
       styleTag = $("<style></style>").appendTo(contents.find("head"));

   $("textarea.edit").keyup(function() {
      var $this = $(this);
      if ($this.attr("id") === "html") {
         body.html($this.val());
      } else {
         // it had to be css
         styleTag.text($this.val());
      }
   });
})();
