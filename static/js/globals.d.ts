/**
 * Внешний глобал GSAP: загружается классическими script-тегами из
 * /static/vendor/gsap/ ДО нашего JS (см. base.html), поэтому в рантайме
 * доступен как глобальная переменная gsap (window.gsap). Тип намеренно
 * широкий — это сторонний скрипт вне нашей типизации, dependency не добавляем.
 */
declare const gsap: any;
declare const bootstrap: any;
declare const SplitText: any;
