const menuToggle = document.getElementById('menu-toggle');
const menuLinks = document.getElementById('menu-links');
const nav = document.querySelector('nav');

menuToggle.addEventListener('click', function() {
    menuLinks.classList.toggle('open');
    nav.classList.toggle('open');
    console.log('done');
});