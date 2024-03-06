/** @satisfies {Record<string, (strings: TemplateStringsArray, ...exprs: any[]) => any>} */
export const Rendered = {
    /**
     * Creates a {@link DocumentFragment} representing the given interpolated HTML string. If the initial backtick is followed
     * immediately by a newline, all initial whitespace is ignored (rather than being rendered as a text node). DOM properties
     * of HTML elements can be set by having an interpolation immediately follow a property name with an equals sign. Thus,
     * 
     * ```
     * Rendered.html`<input value="${5}">`
     * ```
     * 
     * will set the HTML attribute "value" to "5", but
     * 
     * ```
     * Rendered.html`<input value=${5}>`
     * ```
     * 
     * will set the DOM property `.value` to 5. This is especially useful for event handler properties.
     * 
     * If the string contains only a single element and you would like to have the {@link Element} rather than a {@link DocumentFragment}, just access `.firstElementChild`.
     * 
     * @param {TemplateStringsArray} strings
     * @param  {...any} exprs 
     * @returns 
     */
    html(strings, ...exprs) {
        const propAssignmentRegex = /(?<=\s+)(\w+)=$/;
        const rawStrings = [...strings.raw];
        if (strings.raw[0][0] === '\n' || strings.raw[0][0] === '\r') { // if this starts with an explicit linebreak, strip early whitespace
            rawStrings[0] = rawStrings[0].trimStart();
        }
        /** @type {{name: string, value: any}[]} */
        const propertiesToSet = [];
        for (const [i, string] of rawStrings.entries()) {
            const matches = propAssignmentRegex.exec(string);
            if (matches) {
                const propIdx = propertiesToSet.length;
                propertiesToSet.push({name: matches[1], value: exprs[i]});
                rawStrings[i] = string.replace(propAssignmentRegex, "");
                exprs[i] = `data-rendered-prop-to-set data-rendered-prop-idx-${propIdx}="${propIdx}"`;
            }
        }
        let htmlString = String.raw({raw: rawStrings}, ...exprs);
        if (htmlString[0] === '\n' || htmlString[0] === '\r') { // if this starts with a linebreak, strip early whitespace
            htmlString = htmlString.trimStart();
        }
        const template = document.createElement("template");
        template.innerHTML = htmlString;

        for (const elem of template.content.querySelectorAll("[data-rendered-prop-to-set]")) {
            elem.removeAttribute("data-rendered-prop-to-set");
            for (const attr of Array.from(elem.attributes)) {
                if (attr.name.startsWith("data-rendered-prop-idx-")) {
                    const setProp = propertiesToSet[parseInt(attr.value)];
                    elem.removeAttributeNode(attr);
                    if (setProp) {
                        elem[setProp.name] = setProp.value;
                    }
                }
            }
        }
        
        return template.content;
    },
    css(strings, ...exprs) {
        const cssString = String.raw(strings, ...exprs);
        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(cssString);
        return stylesheet;
    },
}

export class KeyboardCueElement extends HTMLElement {
    static tagName = "keyboard-cue";
    static defaultSrc = "img/keyboard.svg";

    // note that the keynames here are based on the US-QWERTY layout, but they only represent the position of the key!
    /** @readonly @satisfies {string[]} */
    static allKeys = /** @type {const} */([
        // primary 77 keys
        "esc", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12", "prntscrn", "scrlock", "pause",
        "grave", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "dash", "equals", "bksp",
        "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "l-bracket", "r-bracket", "backslash",
        "capslock", "a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon", "quote", "return",
        "l-shift", "z", "x", "c", "v", "b", "n", "m", "comma", "period", "slash", "r-shift",
        "l-control", "l-hyper", "l-alt", "space", "r-alt", "r-hyper", "r-meta", "r-control",
        // 6-cluster
        "ins", "home", "pgup",
        "del", "end", "pgdn",
        // cursor keys
        "up", "left", "down", "right",
        // keypad
        "numlock", "divide", "times", "subtract",
        "kp7", "kp8", "kp9", "add",
        "kp4", "kp5", "kp6",
        "kp1", "kp2", "kp3", "kpenter",
        "kp0", "decimal",
    ]);

    /** @typedef {typeof KeyboardCueElement.allKeys[number]} KeyboardCueName */

    /** @param {string} key @returns {key is KeyboardCueName} */
    static isKeyName(key) {
        // @ts-ignore
        return KeyboardCueElement.allKeys.includes(key);
    }

    /** @satisfies {Record<string, {keys: KeyboardCueName[], viewBox: [number, number, number, number]}>} */
    static views = {
        leftSide: {
            keys: [
                "grave", "1", "2", "3", "4", "5", "6",
                "tab", "q", "w", "e", "r", "t",
                "capslock", "a", "s", "d", "f", "g",
                "l-shift", "z", "x", "c", "v",
            ],
            viewBox: [5, 127, 312, 162],
        },
        vimKeys: {
            keys: [
                "6", "7", "8", "9", "0", "dash", "equals", "bksp",
                "t", "y", "u", "i", "o", "p", "l-bracket", "r-bracket", "backslash",
                "g", "h", "j", "k", "l", "semicolon", "quote", "return",
                "b", "n", "m", "comma", "period", "slash", "r-shift",
            ],
            viewBox: [344, 127, 269, 162],
        },
        shortBase: {
            keys: [
                "grave", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "dash", "equals", "bksp",
                "tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "l-bracket", "r-bracket", "backslash",
                "capslock", "a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon", "quote", "return",
                "l-shift", "z", "x", "c", "v", "b", "n", "m", "comma", "period", "slash", "r-shift",
            ],
            viewBox: [5, 72, 811, 219],
        },
        keypad: {
            keys: [
                "numlock", "divide", "times", "subtract",
                "kp7", "kp8", "kp9", "add",
                "kp4", "kp5", "kp6",
                "kp1", "kp2", "kp3", "kpenter",
                "kp0", "decimal",
            ],
            viewBox: [995, 68, 230, 281],
        },
    }

    /** @typedef {keyof typeof KeyboardCueElement.views} KeyboardCueView */
    /** @param {string} key @returns {key is KeyboardCueView} */
    static isViewName(key) {
        return key in KeyboardCueElement.views;
    }


    /** @returns {string[]} */
    static get observedAttributes() {
        return ["keys", "highlight", "secondary", "tertiary", "view-box", "view", "src"];
    }

    /** @type {CSSStyleSheet[]} */
    static stylesheets = [];

    /** @type {DocumentFragment|false} */
    static template;

    static cloneTemplate() {
        this.template ??= this.makeTemplate();
        return this.template ? /** @type {DocumentFragment} */(this.template.cloneNode(true)) : undefined;
    }

    static makeTemplate() {
        this.stylesheets = [];
        return Rendered.html`<svg viewBox="0 0 1226 349" part="svg"></svg>`;
    }

    get view() {
        const view = this.getAttribute("view");
        return KeyboardCueElement.isViewName(view) ? view : null;
    }
    set view(v) {
        if (v == null) {
            this.removeAttribute("view");
        } else {
            this.setAttribute("view", v);
        }
    }

    get viewBox() {
        const vbProp = this.getAttribute("view-box");
        return vbProp?.split(" ").map(Number) ?? KeyboardCueElement.views[this.view].viewBox ?? [0, 0, 1226, 349];
    }
    set viewBox(v) {
        if (v) {
            this.setAttribute("view-box", v.join(" "));
        } else {
            this.removeAttribute("view-box");
        }
    }

    get keys() {
        /** @type {KeyboardCueName[]} */
        const keys = KeyboardCueElement.views[this.view]?.keys.slice() ?? [];
        const keySpec = (this.getAttribute("keys") ?? "").split(/\s+/);
        for (const key of keySpec) {
            if (KeyboardCueElement.isKeyName(key)) {
                keys.push(key);
            } else if (key.startsWith("-")) {
                const name = key.slice(1);
                if (KeyboardCueElement.isKeyName(name) && keys.includes(name)) {
                    keys.splice(keys.indexOf(name), 1);
                }
            }
        }
        return keys;
    }
    set keys(v) {
        this.setAttribute("keys", (v ?? []).join(" "));
    }

    get highlight() {
        return (this.getAttribute("highlight") ?? "").split(/\s+/).filter(KeyboardCueElement.isKeyName);
    }
    set highlight(v) {
        this.setAttribute("highlight", (v ?? []).join(" "));
    }

    get secondary() {
        return (this.getAttribute("secondary") ?? "").split(/\s+/).filter(KeyboardCueElement.isKeyName);
    }
    set secondary(v) {
        this.setAttribute("secondary", (v ?? []).join(" "));
    }

    get tertiary() {
        return (this.getAttribute("tertiary") ?? "").split(/\s+/).filter(KeyboardCueElement.isKeyName);
    }
    set tertiary(v) {
        this.setAttribute("tertiary", (v ?? []).join(" "));
    }

    get src() {
        return this.getAttribute("src") ?? KeyboardCueElement.defaultSrc;
    }
    set src(v) {
        if (!v || v === KeyboardCueElement.defaultSrc) {
            this.removeAttribute("src");
        } else {
            this.setAttribute("src", "v");
        }
    }

    /** @type {SVGSVGElement} */
    svg;

    /** @type {SVGElement} */
    keyContainer;

    /** @param {ShadowRootInit} [shadowRootInit] */
    constructor(shadowRootInit = {mode: "open"}) {
        super();
        const shadowContent = new.target.cloneTemplate();
        const shadow = this.attachShadow(shadowRootInit);
        shadow.append(shadowContent);
        shadow.adoptedStyleSheets.push(...new.target.stylesheets);
        this.svg = shadow.querySelector("svg");
        this.keyContainer = this.svg;
    }

    /** @param {string} name @param {string} oldValue @param {string} newValue */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "view-box" || name === "view") {
            this.shadowRoot.querySelector("svg").setAttribute("viewBox", this.viewBox.join(" "));
        }
        if (["keys", "highlight", "view", "src"]) {
            this.updateKeys();
        }
    }

    updateKeys() {
        const {keys, highlight, secondary, tertiary, keyContainer} = this;
        /** @type {Record<string, SVGUseElement>} */
        const existingKeys = Object.fromEntries(
            Array.from(keyContainer.children)
                 .filter(/** @returns {e is SVGUseElement} */ e => e instanceof SVGUseElement && e.hasAttribute("data-key"))
                 .map(e => [e.getAttribute("data-key"), e]));

        keyContainer.replaceChildren(...keys.map(k => existingKeys[k] ??= this.createKeyElement(k)));
        for (const key of keys) {
            existingKeys[key].part.toggle("highlight", highlight.includes(key));
            existingKeys[key].part.toggle("secondary", secondary.includes(key));
            existingKeys[key].part.toggle("tertiary", tertiary.includes(key));
        }
    }

    /** @param {string} key  @returns {SVGUseElement} */
    createKeyElement(key) {
        const element = Rendered.html`
        <svg>
            <use href="${this.src}#k-${key}" part="key k-${key}"></use>
        </svg>`.firstElementChild.firstElementChild;

        if (!(element instanceof SVGUseElement)) {
            throw new Error("bad <use> element?");
        }

        return element;
    }

    static defineElement() {
        customElements.define(this.tagName, this);
    }
}