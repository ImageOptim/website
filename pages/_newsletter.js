(function(){
if (location.hash == '#newsletter') {
    var newsletter = document.getElementById('newsletter');
    var c = document.getElementById('header');
    c.parentNode.insertBefore(newsletter, c.nextSibling);
    function makeNewsletterVisible(){newsletter.scrollIntoView(false);}
    makeNewsletterVisible();
    addEventListener('load', makeNewsletterVisible, false);
}
})();
