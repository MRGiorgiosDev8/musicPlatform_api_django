class NeonSearchBorder {
    constructor() {
        this.searchInput = null;
        this.svgBorder = null;
        this.timeline = null;
        this.isActive = false;
        this.init();
    }

    init() {
        this.createSVGBorder();
        this.setupEventListeners();
    }

    createSVGBorder() {
        const searchContainer = document.querySelector('.form-search .position-relative');
        if (!searchContainer) return;

        const searchInput = searchContainer.querySelector('.input-search');
        if (!searchInput) return;

        const inputStyles = window.getComputedStyle(searchInput);
        const borderRadius = parseFloat(inputStyles.borderRadius) || 4;
        const width = searchInput.offsetWidth;
        const height = searchInput.offsetHeight;

        this.searchInput = searchInput;

        const svgWrapper = document.createElement('div');
        svgWrapper.className = 'neon-border-wrapper';
        svgWrapper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.4s ease;
        `;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: visible;
        `;

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const outerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        outerGlow.setAttribute('id', 'neon-glow-outer');
        outerGlow.setAttribute('x', '-50%');
        outerGlow.setAttribute('y', '-50%');
        outerGlow.setAttribute('width', '200%');
        outerGlow.setAttribute('height', '200%');

        const gaussianBlur1 = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        gaussianBlur1.setAttribute('stdDeviation', '0.3');
        gaussianBlur1.setAttribute('result', 'coloredBlur');

        const feMerge1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');

        feMerge1.appendChild(feMergeNode1);
        feMerge1.appendChild(feMergeNode2);
        outerGlow.appendChild(gaussianBlur1);
        outerGlow.appendChild(feMerge1);

        const innerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        innerGlow.setAttribute('id', 'neon-glow-inner');
        innerGlow.setAttribute('x', '50%');
        innerGlow.setAttribute('y', '50%');
        innerGlow.setAttribute('width', '200%');
        innerGlow.setAttribute('height', '200%');

        const gaussianBlur2 = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        gaussianBlur2.setAttribute('stdDeviation', '0.3');
        gaussianBlur2.setAttribute('result', 'coloredBlur2');

        const feMerge2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode3 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode3.setAttribute('in', 'coloredBlur2');
        const feMergeNode4 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode4.setAttribute('in', 'SourceGraphic');

        feMerge2.appendChild(feMergeNode3);
        feMerge2.appendChild(feMergeNode4);
        innerGlow.appendChild(gaussianBlur2);
        innerGlow.appendChild(feMerge2);

        defs.appendChild(outerGlow);
        defs.appendChild(innerGlow);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = this.createRoundedRectPath(
            1,
            1,
            width - 2,
            height - 2,
            borderRadius
        );

        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#ff3333');
        path.setAttribute('stroke-width', '1.2');
        path.setAttribute('filter', 'url(#neon-glow-outer)');
        path.style.cssText = `
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
        `;

        svg.appendChild(defs);
        svg.appendChild(path);

        const secondPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        secondPath.setAttribute('d', pathData);
        secondPath.setAttribute('fill', 'none');
        secondPath.setAttribute('stroke', '#ff3333');
        secondPath.setAttribute('stroke-width', '1.2');
        secondPath.setAttribute('filter', 'url(#neon-glow-outer)');
        secondPath.style.cssText = `
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
        `;

        svg.appendChild(secondPath);

        svgWrapper.appendChild(svg);

        searchContainer.appendChild(svgWrapper);
        this.svgBorder = svgWrapper;
        this.mainPath = path;
        this.secondPath = secondPath;
    }

    createRoundedRectPath(x, y, width, height, radius) {
        const r = Math.min(radius, Math.min(width, height) / 2);
        return `
            M ${x + r} ${y}
            L ${x + width - r} ${y}
            Q ${x + width} ${y} ${x + width} ${y + r}
            L ${x + width} ${y + height - r}
            Q ${x + width} ${y + height} ${x + width - r} ${y + height}
            L ${x + r} ${y + height}
            Q ${x} ${y + height} ${x} ${y + height - r}
            L ${x} ${y + r}
            Q ${x} ${y} ${x + r} ${y}
            Z
        `;
    }

    setupEventListeners() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('focus', () => this.startAnimation());
        this.searchInput.addEventListener('blur', () => this.stopAnimation());

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.recreateSVG();
            }, 250);
        });
    }

    startAnimation() {
        if (!this.svgBorder || this.isActive) return;

        this.isActive = true;
        this.svgBorder.style.opacity = '1';

        if (!this.timeline) {

            const path1 = this.mainPath;
            const path2 = this.secondPath;
            const fullLength = path1.getTotalLength();
            const segmentLength = fullLength * 0.06;

            path1.style.strokeDasharray = `${segmentLength} ${fullLength}`;
            path1.style.strokeDashoffset = '0';

            path2.style.strokeDasharray = `${segmentLength} ${fullLength}`;
            path2.style.strokeDashoffset = `${-segmentLength}`;

            this.timeline = gsap.timeline({ repeat: -1 });

            this.timeline.to(path1, {
                strokeDashoffset: -fullLength,
                duration: 2,
                ease: 'none',
                repeat: -1
            }, 0);

            this.timeline.to(path2, {
                strokeDashoffset: -fullLength - segmentLength,
                duration: 2,
                ease: 'none',
                repeat: -1
            }, 0);
        }
    }

    stopAnimation() {
        if (!this.svgBorder || !this.isActive) return;

        this.isActive = false;
        gsap.to(this.svgBorder, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out'
        });
    }

    recreateSVG() {
        if (!this.searchInput || !this.svgBorder) return;

        const inputStyles = window.getComputedStyle(this.searchInput);
        const borderRadius = parseFloat(inputStyles.borderRadius) || 4;
        const width = this.searchInput.offsetWidth;
        const height = this.searchInput.offsetHeight;

        const svg = this.svgBorder.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        const pathData = this.createRoundedRectPath(
            1,
            1,
            width - 2,
            height - 2,
            borderRadius
        );
        if (this.mainPath) {
            this.mainPath.setAttribute('d', pathData);
        }
        if (this.secondPath) {
            this.secondPath.setAttribute('d', pathData);
        }
    }

    destroy() {
        if (this.timeline) {
            this.timeline.kill();
        }

        if (this.svgBorder && this.svgBorder.parentNode) {
            this.svgBorder.parentNode.removeChild(this.svgBorder);
        }

        if (this.searchInput) {
            this.searchInput.removeEventListener('focus', this.startAnimation);
            this.searchInput.removeEventListener('blur', this.stopAnimation);
        }
    }
}


window.onload = () => {
    const neonBorder = new NeonSearchBorder();
    requestAnimationFrame(() => {
        if (typeof neonBorder.recreateSVG === 'function') {
            neonBorder.recreateSVG();
        }
    });
};
