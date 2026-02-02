document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('#navbarNav');
    const toggler = document.querySelector('.navbar-toggler');

    let menuAnimation = null;

    menu.addEventListener('show.bs.collapse', (e) => {
        e.preventDefault();

        gsap.fromTo(menu,
            { height: 0, opacity: 0 },
            {
                height: "auto",
                opacity: 1,
                duration: 0.5,
                ease: "power3.out",
                onStart: () => menu.classList.add('show')
            }
        );

        gsap.to(toggler, { rotation: 90, duration: 0.3 });
    });

    menu.addEventListener('hide.bs.collapse', (e) => {
        e.preventDefault();

        gsap.to(menu, {
            height: 0,
            opacity: 0,
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => {
                menu.classList.remove('show');
                gsap.set(menu, { clearProps: "height,opacity" });
            }
        });

        gsap.to(toggler, { rotation: 0, duration: 0.3 });
    });
});