import { animationFrame as nextAnimationFrame, fromTypedEntries, getElement, invertMap, mapToEntries, mapToValues, svgElement, tuple, typedEntries, after } from "./helpers.js";

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

export class BaseComponent extends HTMLElement {
    static tagName = "";

    /** @type {CSSStyleSheet[]} */
    static stylesheets = [];

    /** @type {DocumentFragment|false} */
    static template;

    static cloneTemplate() {
        this.template ??= this.makeTemplate();
        return this.template ? /** @type {DocumentFragment} */(this.template.cloneNode(true)) : undefined;
    }

    /** @returns {DocumentFragment} */
    static makeTemplate() {
        this.stylesheets = [];
        return null;
    }

    static defineElement() {
        customElements.define(this.tagName, this);
        console.log(`Defined ${this.tagName} as ${this.name}`);
    }

    /** @returns {string[]} */
    static get observedAttributes() {
        return [];
    }

    /** @param {ShadowRootInit} [shadowRootInit] */
    constructor(shadowRootInit = {mode: "open"}) {
        super();
        const shadowContent = new.target.cloneTemplate();
        const shadow = this.attachShadow(shadowRootInit);
        shadow.append(shadowContent);
        shadow.adoptedStyleSheets.push(...new.target.stylesheets);
    }

    /** @param {string} name @param {string} oldValue @param {string} newValue */
    attributeChangedCallback(name, oldValue, newValue) {
    }
}

export class KeyboardCueElement extends BaseComponent {
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
        "l-control", "l-meta", "l-alt", "space", "r-alt", "r-meta", "contextmenu", "r-control",
        // 6-cluster
        "ins", "home", "pgup",
        "del", "end", "pgdn",
        // cursor keys
        "up", "left", "down", "right",
        // keypad
        "numlock", "divide", "multiply", "subtract",
        "kp7", "kp8", "kp9", "add",
        "kp4", "kp5", "kp6",
        "kp1", "kp2", "kp3", "kpenter",
        "kp0", "decimal",
    ]);

    /** @readonly @satisfies {Record<KeyboardCueName, string>} */
    static keysToDOMCodes = /** @type {const} */({
        esc: "Escape", f1: "F1", f2: "F2", f3: "F3", f4: "F4", f5: "F5", f6: "F6", f7: "F7", f8: "F8", f9: "F9", f10: "F10", f11: "F11", f12: "F12", prntscrn: "PrintScreen", scrlock: "ScrollLock", pause: "Pause",
        grave: "Backquote", "1": "Digit1", "2": "Digit2", "3": "Digit3", "4": "Digit4", "5": "Digit5", "6": "Digit6", "7": "Digit7", "8": "Digit8", "9": "Digit9", "0": "Digit0", dash: "Minus", equals: "Equal", bksp: "Backspace",
        tab: "Tab", q: "KeyQ", w: "KeyW", e: "KeyE", r: "KeyR", t: "KeyT", y: "KeyY", u: "KeyU", i: "KeyI", o: "KeyO", p: "KeyP", "l-bracket": "BracketLeft", "r-bracket": "BracketRight", backslash: "Backslash",
        capslock: "CapsLock", a: "KeyA", s: "KeyS", d: "KeyD", f: "KeyF", g: "KeyG", h: "KeyH", j: "KeyJ", k: "KeyK", l: "KeyL", semicolon: "Semicolon", quote: "Quote", return: "Enter",
        "l-shift": "ShiftLeft", z: "KeyZ", x: "KeyX", c: "KeyC", v: "KeyV", b: "KeyB", n: "KeyN", m: "KeyM", comma: "Comma", period: "Period", slash: "Slash", "r-shift": "ShiftRight",
        "l-control": "ControlLeft", "l-meta": "MetaLeft", "l-alt": "AltLeft", space: "Space", "r-alt": "AltRight", "r-meta": "MetaRight", contextmenu: "ContextMenu", "r-control": "ControlRight",

        // 6-cluster
        ins: "Insert", home: "Home", pgup: "PageUp", del: "Delete", end: "End", pgdn: "PageDown",

        // cursor keys
        up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight",

        // keypad
        numlock: "NumLock", divide: "NumpadDivide", multiply: "NumpadMultiply", subtract: "NumpadSubtract", kp7: "Numpad7", kp8: "Numpad8", kp9: "Numpad9", add: "NumpadAdd", kp4: "Numpad4", kp5: "Numpad5", kp6: "Numpad6", kp1: "Numpad1", kp2: "Numpad2", kp3: "Numpad3", kpenter: "NumpadEnter", kp0: "Numpad0", decimal: "NumpadDecimal",
    })

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
                "numlock", "divide", "multiply", "subtract",
                "kp7", "kp8", "kp9", "add",
                "kp4", "kp5", "kp6",
                "kp1", "kp2", "kp3", "kpenter",
                "kp0", "decimal",
            ],
            viewBox: [995, 68, 230, 281],
        },
        full: {
            keys: this.allKeys,
            viewBox: [0, 0, 1226, 349]
        }
    };

    /** @typedef {typeof KeyboardCueElement.allKeys[number]} KeyboardCueName */
    /** @typedef {keyof typeof KeyboardCueElement.views} KeyboardCueView */
    /** @param {string} key @returns {key is KeyboardCueView} */
    static isViewName(key) {
        return key in KeyboardCueElement.views;
    }

    /** @type {Record<string, Promise<Record<KeyboardCueName, SVGRect>>>} */
    static keyRectsPerSrc = {};

    /** @returns {string[]} */
    static get observedAttributes() {
        return ["keys", "highlight", "lowlight", "secondary", "tertiary", "view-box", "view", "src"];
    }

    static makeTemplate() {
        super.makeTemplate();
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

    /** @type {KeyTokenList} */
    #keys;
    get keys() {
        return this.#keys ??= new KeyTokenList(this, "keys", KeyboardCueElement.views[this.view]?.keys);
    }

    /** @type {KeyTokenList} */
    #highlight;
    get highlight() {
        return this.#highlight ??= new KeyTokenList(this, "highlight");
    }

    /** @type {KeyTokenList} */
    #lowlight;
    get lowlight() {
        return this.#lowlight ??= new KeyTokenList(this, "lowlight");
    }

    /** @type {KeyTokenList} */
    #secondary;
    get secondary() {
        return this.#secondary ??= new KeyTokenList(this, "secondary");
    }

    /** @type {KeyTokenList} */
    #tertiary;
    get tertiary() {
        return this.#tertiary ??= new KeyTokenList(this, "tertiary");
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
    svg = this.shadowRoot.querySelector("svg");

    /** @type {SVGElement} */
    keyContainer = this.svg;

    /** @type {Readonly<Record<KeyboardCueName, SVGRect>>} */
    keyRects = (this.updateKeyRects(), null);

    /** @param {string} name @param {string} oldValue @param {string} newValue */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "view-box" || name === "view") {
            this.shadowRoot.querySelector("svg").setAttribute("viewBox", this.viewBox.join(" "));
        }
        if (["keys", "highlight", "lowlight", "secondary", "tertiary", "view", "src"].includes(name)) {
            this.updateKeys();
        }
        if (name === "src" && this.src) {
            this.updateKeyRects();
        }
    }

    updateKeys() {
        const {keys, highlight, lowlight, secondary, tertiary, keyContainer} = this;
        /** @type {Record<string, SVGUseElement>} */
        const existingKeys = Object.fromEntries(
            Array.from(keyContainer.children)
                 .filter(/** @returns {e is SVGUseElement} */ e => e instanceof SVGUseElement && e.hasAttribute("data-key"))
                 .map(e => [e.getAttribute("data-key"), e]));

        keyContainer.replaceChildren(...keys.map(k => existingKeys[k] ??= this.createKeyElement(k)));
        for (const key of keys) {
            existingKeys[key].part.toggle("highlight", highlight.contains(key));
            existingKeys[key].part.toggle("lowlight", lowlight.contains(key));
            existingKeys[key].part.toggle("secondary", secondary.contains(key));
            existingKeys[key].part.toggle("tertiary", tertiary.contains(key));
        }
    }

    async updateKeyRects() {
        KeyboardCueElement.keyRectsPerSrc[this.src] ??= this.fetchKeyRects(this.src);
        try {
            this.keyRects = await KeyboardCueElement.keyRectsPerSrc[this.src];
        } catch (e) {
            KeyboardCueElement.keyRectsPerSrc[this.src] = null;
            throw e;
        }
        return this.keyRects;
    }

    async fetchKeyRects(src = KeyboardCueElement.defaultSrc) {
        const response = await fetch(src);
        const text = await response.text();

        const div = Rendered.html`
            <div style="position:absolute;visibility:hidden;" innerHTML=${text}></div>`.firstElementChild;

        document.body.append(div);
        
        try {
            const svg = getElement(div.firstElementChild, SVGSVGElement);

            return mapToValues(
                KeyboardCueElement.allKeys,
                k => (getElement(svg.getElementById(`k-${k}`), SVGPathElement)).getBBox());
        } finally  {
            div.remove();
        }
    }

    /** @param {string} key @returns {SVGUseElement} */
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
}

export class MessageLogElement extends BaseComponent {
    static tagName = "message-log";

    static get observedAttributes() {
        return ["limit"];
    }

    static makeTemplate() {
        super.makeTemplate();
        return Rendered.html`<slot></slot>`;
    }

    /** @type {HTMLLIElement[]} */
    messages = []

    #limit = 50;
    get limit() {
        return this.#limit;
    }
    set limit(v) {
        if (v !== this.#limit) {
            this.#limit = v;
            if (parseInt(this.getAttribute("limit")) !== v) {
                this.setAttribute("limit", String(v));
            }
        }
    }

    /** @param {string} name @param {string} oldValue @param {string} newValue */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "limit") {
            const newLimit = parseInt(newValue);
            if (Number.isSafeInteger(newLimit))
            this.#limit = Math.max(newLimit, 0);
            this.trimOldMessages();
        }
    }

    /** @param {...string|Node} content  */
    addMessage(...content) {
        const li = document.createElement("li");
        li.className = "new message";
        li.append(...content);
        this.prepend(li);
        after(10).then(() => li.classList.remove("new"));
        this.messages.push(li);
        this.trimOldMessages();
    }

    trimOldMessages() {
        while (this.messages.length && this.messages.length > this.limit) {
            const li = this.messages.shift();
            li?.remove();
        }
    }
}

/** @extends {Array<KeyboardCueName>} */
export class KeyTokenList extends Array {
    #element;
    #attr;
    #viewKeys;
    /** @param {KeyboardCueElement} element @param {string} attr @param {KeyboardCueName[]} [viewKeys] */
    constructor(element, attr, viewKeys = []) {
        super(...viewKeys);
        this.#viewKeys = viewKeys;
        this.#element = element;
        this.#attr = attr;
        this.reparse();
    }

    get value() {
        return this.filter(k => !this.#viewKeys.includes(k))
                   .concat(this.#viewKeys
                               .filter(k => !this.includes(k))
                               .map(k => /** @type {any} */(`-${k}`)))
                   .join(" ");
    }

    reparse() {
        this.length = 0;
        this.push(...this.#viewKeys);
        const value = this.#element?.getAttribute?.(this.#attr);
        
        for (const token of value?.split(/\s+/) ?? []) {
            if (isKeyName(token)) {
                this.push(token);
            } else if (token.startsWith("-")) {
                const key = token.slice(1);
                if (isKeyName(key) && this.includes(key)) {
                    this.splice(this.indexOf(key), 1);
                }
            }
        }

    }

    /** @param {...KeyboardCueName} tokens  */
    add(...tokens) {
        let changed = false;
        for (const item of tokens) {
            if (!this.includes(item)) {
                changed = true;
                this.push(item);
            }
        }
        if (changed) {
            this.#element.setAttribute(this.#attr, this.value);
        }
    }
    /** @param {KeyboardCueName} token  */
    contains(token) {
        return this.includes(token);
    }

    /** @param {number} index  */
    item(index) {
        return this[index] ?? null;
    }

    /** @param {...KeyboardCueName} tokens  */
    remove(...tokens) {
        let changed = false;
        for (const token of tokens) {
            const index = this.indexOf(token);
            if (index >= 0) {
                changed = true;
                this.splice(index, 1);
            }
        }
        if (changed) {
            this.#element.setAttribute(this.#attr, this.value);
        }
    }

    /** @param {KeyboardCueName} oldItem @param {KeyboardCueName} newItem */
    replace(oldItem, newItem) {
        const index = this.indexOf(oldItem);
        if (index < 0) {
            return false;
        }
        this[index] = newItem;
        this.#element.setAttribute(this.#attr, this.value);
            return true;
    }

    /** @param {KeyboardCueName} item @param {boolean} [force] */
    toggle(item, force) {
        const index = this.indexOf(item);
        const present = index >= 0;
        if (present === force) return present;
        if (present) {
            this.splice(index, 1);
            this.#element.setAttribute(this.#attr, this.value);
            return false;
        } else {
            this.push(item);
            this.#element.setAttribute(this.#attr, this.value);
            return true;
        }
    }
    
    /** @param {string} token @returns {token is KeyboardCueName} */
    supports(token) {
        return isKeyName(token);
    }
}

/** @param {string} key @returns {key is KeyboardCueName} */
export function isKeyName(key) {
    // @ts-ignore
    return KeyboardCueElement.allKeys.includes(key);
}

console.groupCollapsed("Defining custom HTML components");
KeyboardCueElement.defineElement();
MessageLogElement.defineElement();
console.groupEnd();
Object.assign(self, {KeyboardCueElement, KeyTokenList, isKeyName});
