import { fromTypedEntries, invertMap, typedEntries } from "./helpers.js";
import { KeyboardCueElement } from "./uicomponents.js";

export class InputManager {
    /** @type {InputManager} */
    static #instance;
    static get instance() {
        if (!this.#instance) {
            this.#instance = new this();
        }
        return this.#instance;
    }
    _ = InputManager.#instance ??= this;

    /** @readonly */
    static keyCodesToKeyCues = invertMap(KeyboardCueElement.keysToDOMCodes);
    /** @readonly */
    static keySymbolsToKeyCues = symbolMap([typedEntries(this.keyCodesToKeyCues)?.[0]?.[1]]);
    static {
        for (const [code, cue] of typedEntries(this.keyCodesToKeyCues)) {
            this.keySymbolsToKeyCues[keySymbol(code)] = [cue];
        }
    }

    /** @param {string} name @returns {name is DOMKeyCode} */
    static isKeyCode(name) {
        return name in InputManager.keyCodesToKeyCues;
    }

    /** @type {Record<Extract<Exclude<keyof KeyboardEvent, keyof UIEvent>, `${string}Key`>, DOMKeySymbol[]>} */
    static modifierKeys = {
        altKey: [keySymbol("AltLeft"), keySymbol("AltRight")],
        ctrlKey: [keySymbol("ControlLeft"), keySymbol("ControlRight")],
        metaKey: [keySymbol("MetaLeft"), keySymbol("MetaRight")],
        shiftKey: [keySymbol("ShiftLeft"), keySymbol("ShiftRight")],
    };
    /** @readonly @satisfies {(keyof typeof InputManager.modifierKeys)[]} */
    static modifierKeyNames = /** @type {const} */(["altKey", "ctrlKey", "metaKey", "shiftKey"])

    keysPressed = symbolMap(true);
    charsPressed = symbolMap("");

    /** @type {KeyboardCueElement[]} */
    keyIndicators = [];

    #singleKeyIndicator = [this.keyIndicators[0]];

    get activeKeyIndicators() {
        if (this.keyIndicators.length === 0 || this.helpOpen) {
            return this.keyIndicators;
        }
        this.#singleKeyIndicator[0] = this.keyIndicators[0];
        return this.#singleKeyIndicator;
    }
    
    /** @type {HTMLDialogElement} */
    helpDialog;

    /** @type {HTMLElement} */
    bindingLabel;

    get helpOpen() {
        return this.helpDialog?.open ?? false;
    }

    /** @type {InputAction[]} */
    #activatedMatches = [];
    /** @type {InputAction[]} */
    #deactivatedMatches = [];

    repeatDelay = 500;
    repeatInterval = 250;

    paused = false;

    /** @type {KeyBindingMap} */
    keyBindings = {};
    /** @type {CharBindingMap} */
    charBindings = {};

    /** @type {InputAction[]} */
    activeActions = [];
    
    /** @type {InputAction[]} */
    lastTriggeredActions = [];

    /** @type {InputAction[]} */
    allActions = [];

    alwaysIgnoreKeys = symbolMap(true);

    /** @type {(dx: number, dy: number, dz: number) => void} */
    moveHandler;

    lastModifiers = [false, false, false, false];

    constructor() {
        if (new.target.#instance !== this) { // gets set by initializer
            throw new Error(`May not construct additional instances of ${new.target.name}`);
        }
        new.target.#instance = this;
        this.trackKeyState = this.trackKeyState.bind(this);
        this.handleKeyEvent = this.handleKeyEvent.bind(this);
    }

    /** @param {...DOMKeyCode} keys  */
    ignoreKeys(...keys) {
        for (const key of keys) {
            this.alwaysIgnoreKeys[keySymbol(key)] = true;
        }
    }

    /** @param {...DOMKeyCode} keys  */
    unignoreKeys(...keys) {
        for (const key of keys) {
            this.alwaysIgnoreKeys[keySymbol(key)] = false;
        }
    }

    /** @param {ActionFunction | InputAction} actionOrCallback @param {...(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} keys  */
    bind(actionOrCallback, ...keys) {
        if (typeof actionOrCallback === "function") {
            actionOrCallback = new CallbackAction(actionOrCallback);
        }

        this.allActions.push(actionOrCallback);

        for (const binding of actionOrCallback.bindings) {
            binding.bind(this);
        }

        for (const alternative of keys) {
            actionOrCallback.addKeyBinding(alternative);
        }
        return actionOrCallback;
    }

    /** @param {ActionFunction | InputAction} actionOrCallback @param {...(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} keys  */
    unbind(actionOrCallback, ...keys) {
        throw new Error("not implemented");
    }

    /** @param {ActionBinding} binding  */
    addBinding(binding) {
        if (!this.allActions.includes(binding.action)) {
            this.allActions.push(binding.action);
        }
        const {keySymbolsToKeyCues} = InputManager;
        if (binding instanceof ActionKeyBinding) {
            for (const key of binding.keys) {
                const arr = (this.keyBindings[key] ??= [])
                if (!arr.includes(binding))
                    arr.push(binding);
                for (const ki of this.keyIndicators) {
                    ki.lowlight.add(...(keySymbolsToKeyCues[key] ?? []))
                }
                if (binding.action instanceof VKeyAction) {
                    (keySymbolsToKeyCues[binding.action.virtualKey] ??= []).push(...(keySymbolsToKeyCues[key] ?? []));
                }
            }
        }
        
        if (binding instanceof ActionCharBinding) {
            const arr = (this.charBindings[binding.char] ??= []);
            if (!arr.includes(binding)) arr.push(binding);
        }

    }

    /** @param {ActionBinding} binding  */
    removeBinding(binding) {
        if (binding instanceof ActionKeyBinding) {
            for (const key of binding.keys) {
                const index = this.keyBindings[key]?.indexOf(binding) ?? -1;
                if (index >= 0) {
                    this.keyBindings[key].splice(index, 1);
                }
                for (const ki of this.keyIndicators) {
                    ki.lowlight.remove(...(InputManager.keySymbolsToKeyCues[key] ?? []))
                }
            }
        }
        if (binding instanceof ActionCharBinding) {
        }
    }

    attach(target = window) {
        target.addEventListener("keydown", this.trackKeyState, {"capture": true, "passive": true});
        target.addEventListener("keyup", this.trackKeyState, {"capture": true, "passive": true});
        target.addEventListener("keydown", this.handleKeyEvent);
        target.addEventListener("keyup", this.handleKeyEvent);
    }

    detach(target = window) {
        target.removeEventListener("keydown", this.trackKeyState, {"capture": true});
        target.removeEventListener("keyup", this.trackKeyState, {"capture": true});
        target.removeEventListener("keydown", this.handleKeyEvent);
        target.removeEventListener("keyup", this.handleKeyEvent);
    }

    #actionStatesDirty = false;
    /** @param {KeyboardEvent} event */
    trackKeyState(event) {
        const {isKeyCode, modifierKeyNames, modifierKeys} = InputManager;
        const sym = isKeyCode(event.code) ? keySymbol(event.code) : null;
        if (sym) {
            if (this.alwaysIgnoreKeys[sym]) return; // ignore this event entirely

            const isDown = event.type === "keydown";
            this.#keyChange(sym, isDown, true);
        }

        for (let i = 0; i < modifierKeyNames.length; i++) {
            const keyProp = modifierKeyNames[i];
            const state = event[keyProp];
            if (this.lastModifiers[i] && !state) {
                for (const modSym of modifierKeys[keyProp]) {
                    if (this.keysPressed[modSym] && modSym !== sym) {
                        this.#keyChange(modSym, false, true);
                        this.#actionStatesDirty = true;
                    }
                }
            }
            this.lastModifiers[i] = state;
        }
    }

    /** @param {DOMKeySymbol} sym @param {boolean} isDown  */
    #keyChange(sym, isDown, doHighlight = false) {
        this.keysPressed[sym] = isDown;
        if (!isDown && this.charsPressed[sym]) {
            this.charsPressed[sym] = null;
        }
        if (doHighlight) {
            for (const ki of this.activeKeyIndicators) {
            for (const keyname of InputManager.keySymbolsToKeyCues[sym] ?? []) {
                    ki.highlight.toggle(keyname, isDown);
                }
            }
        }
    }

    /** @param {DOMKeySymbol} keySym @param {boolean} isDown @param {UIEvent} event */
    setKeyState(keySym, isDown, event) {
        this.keysPressed[keySym] = isDown;
        this.handleKeySym(keySym, event);
    }

    handleKeySym(keySym, event) {
        if (this.alwaysIgnoreKeys[keySym]) {
            return false;
        }
        const bindings = this.keyBindings[keySym];

        const length = bindings?.length ?? 0;
        for (let i = 0; i < length; i++) {
            const binding = bindings[i];
            const matches = binding.matches(event, this);
            this.setBindingActive(binding, matches, event); // may cause an action to activate or deactivate
        }
        return true;
    }

    /** @param {KeyboardEvent} event */
    handleKeyEvent(event) {
        if (event.defaultPrevented) return;

        if (this.#actionStatesDirty) {
            // we had to do an emergency modifier reset, so go through and check all our actions. actions
            // that are active but have no matches get silently reset.
            for (const action of this.allActions) {
                if (action.isActive && !action.hasMatch(null, this)) {
                    action.deactivate(null, this);
                    for (const binding of action.bindings) {
                        binding.isActive = false;
                    }
                }
            }
            this.#actionStatesDirty = false;
        }

        const wasActive = this.activeActions.length > 0;

        this.#activatedMatches.length = 0;
        this.#deactivatedMatches.length = 0;

        const sym = InputManager.isKeyCode(event.code) ? keySymbol(event.code) : null;
        
        if (sym) {
            if (this.handleKeySym(sym, event) === false) {
                // bail, don't process further, don't prevent default
                return;
            }
        }

        if (event.key && event.key in this.charBindings) {
            const bindings = this.charBindings[event.key];
            const length = bindings?.length ?? 0;
            if (sym) {
                this.charsPressed[sym] = event.key;
            }
            for (let i = 0; i < length; i++) {
                const binding = bindings[i];
                const matches = binding.matches(event, this);
                this.setBindingActive(binding, matches, event);
            }
        }

        if (this.#activatedMatches.length) {
            this.bindingLabel.textContent = `Activated: ${this.#activatedMatches.map(a => a.name).join(", ")}`;
        } else if (this.#deactivatedMatches.length) {
            this.bindingLabel.textContent = `Deactivated: ${this.#deactivatedMatches.map(a => a.name).join(", ")}`;
        }
        
        if (wasActive || this.activeActions.length > 0) {
            event.preventDefault();
        }
    }
    
    /** @param {ActionBinding} binding @param {boolean} active  @param {UIEvent} event */
    setBindingActive(binding, active, event) {
        binding.setActive(event, active, this);
    }

    triggerMoveHandler(dx=0, dy=0, dz=0) {
        this.moveHandler?.(dx, dy, dz);
    }

    /** @param {InputAction} action @param {boolean} active  */
    reportActionState(action, active) {
        const {activeActions} = this;
        if (active && !activeActions.includes(action)) {
            activeActions.push(action);
            if (action.name && !(action instanceof VKeyAction)) {
                this.#activatedMatches.push(action);
            }
        } else if (!active) {
            const index = activeActions.indexOf(action);
            if (index >= 0) {
                activeActions.splice(index, 1);
                if (action.name && !(action instanceof VKeyAction)) {
                    this.#deactivatedMatches.push(action);
                }
            }
        }
    }

    toggleHelp() {
        this.bindingLabel.textContent = "";
        if (this.helpOpen) {
            this.helpDialog.close("cancel");
            this.paused = false;
        } else {
            this.helpDialog.showModal();
            this.paused = true;
        }
    }

    HelpAction = new CallbackAction(() => this.toggleHelp(), "Help", false);

    // enabling any of these cause the input manager to think of these as "bound keys" and
    // start blocking keyboard events by default
    /** @readonly */
    VKeyAlt = new VKeyAction("Alt").addKeyBindings("AltLeft", "AltRight").virtualKey;
    // /** @readonly */
    // VKeyShift = new VKeyAction("Shift").addKeyBindings("ShiftLeft", "ShiftRight").virtualKey;
    // /** @readonly */
    // VKeyControl = new VKeyAction("Control").addKeyBindings("ControlLeft", "ControlRight").virtualKey;
    // /** @readonly */
    // VKeyMeta = new VKeyAction("Meta").addKeyBindings("MetaLeft", "MetaRight").virtualKey;
}

export class InputAction {
    name = "Perform Action";

    /** @type {ActionBinding[]} */
    bindings = [];

    #isActive = false;
    get isActive() {
        return this.#isActive;
    }

    repeatable = true;
    #disabled = false;
    get disabled() { return this.#disabled; }
    set disabled(v) {
        if (v !== this.#disabled) {
            this.#disabled = v;
            this.checkBindings();
        }
    }

    /** @param {string} name  */
    constructor(name, repeatable = true, disabled = false) {
        this.name = name;
        this.repeatable = repeatable;
        this.disabled = disabled;
    }

    setName(name) {
        this.name = name;
        return this;
    }

    /** @param {UIEvent} event  */
    activate(event, input = InputManager.instance) {
        this.#isActive = true;
        input.reportActionState(this, true);
    }

    repeat(input = InputManager.instance) {
    }

    /** @param {UIEvent} event  */
    deactivate(event, input = InputManager.instance) {
        this.#isActive = false;
        input.reportActionState(this, false);
    }

    /** @param {UIEvent} event  */
    matchAllowed(event) {
        return true;
    }

    /** @param {UIEvent} event  */
    hasMatch(event, input = InputManager.instance) {
        for (const binding of this.bindings) {
            if (binding.matches(event, input)) {
                return true;
            }
        }
        return false;
    }

    /** @param {UIEvent} [event]  */
    checkBindings(event, input = InputManager.instance) {
        const hasActiveBinding = this.hasMatch(event, input);
        if (hasActiveBinding && !this.isActive) {
            this.activate(event, input);
        } else if (!hasActiveBinding && this.isActive) {
            this.deactivate(event, input);
        }
    }

    /** @param {ActionBinding} binding  */
    indexOfBinding(binding) {
        return this.bindings.findIndex(b => binding.equals(b));
    }

    /** @param {ActionBinding} binding  */
    findBinding(binding) {
        return this.bindings.find(b => binding.equals(b));
    }

    /** @param {ActionBinding} newBinding  */
    addBinding(newBinding, recheck = true) {
        if (this.findBinding(newBinding)) return this;
        this.bindings.push(newBinding);
        newBinding.bind();
        if (recheck) this.checkBindings();
        return newBinding;
    }

    /** @param {ActionBinding} binding */
    removeBinding(binding, recheck = true) {
        const index = this.indexOfBinding(binding);
        if (index < 0) return this;

        const oldBinding = this.bindings.splice(index, 1)[0];
        if (recheck) this.checkBindings();
        oldBinding.unbind();
        return this;
    }

    /** @param {(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} keys */
    addKeyBinding(keys, repeatable = true, disabled = false) {
        if (!Array.isArray(keys)) keys = [keys];
        const newBinding = new ActionKeyBinding(this, keys);
        newBinding.repeatable = repeatable;
        newBinding.disabled = disabled;
        return this.addBinding(newBinding);
    }

    /** @param {...(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} bindings */
    addKeyBindings(...bindings) {
        for (const binding of bindings) {
            this.addKeyBinding(binding, this.repeatable);
        }
        return this;
    }

    /** @param {...(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} bindings */
    removeKeyBindings(...bindings) {
        for (const binding of bindings) {
            this.removeKeyBinding(binding);
        }
        return this;
    }

    /** @param {(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} keys  */
    removeKeyBinding(keys) {
        if (!Array.isArray(keys)) keys = [keys];
        const searchBinding = new ActionKeyBinding(this, keys);
        return this.removeBinding(searchBinding);
    }

    /** @param {string} char @param {(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} [keys] */
    addCharBinding(char, keys, repeatable = true, disabled = false) {
        if (!Array.isArray(keys)) keys = keys ? [keys] : [];
        const newBinding = new ActionCharBinding(this, char, keys);
        newBinding.repeatable = repeatable;
        newBinding.disabled = disabled;
        return this.addBinding(newBinding);
    }

    /** @param {string} char @param {(DOMKeyCode|DOMKeySymbol)[]|DOMKeyCode|DOMKeySymbol} [keys] */
    removeCharBinding(char, keys) {
        if (!Array.isArray(keys)) keys = keys ? [keys] : [];
        const searchBinding = new ActionKeyBinding(this, keys);
        return this.removeBinding(searchBinding);
    }
}

export class DOMListAction extends InputAction {
    tokenList;
    item;

    /** @param {string} name @param {DOMTokenList} tokenList @param {string} item */
    constructor(name, tokenList, item, disabled = false) {
        super(name, false, disabled);
        this.tokenList = tokenList;
        this.item = item;
    }

    /** @param {UIEvent} event */
    activate(event, input = InputManager.instance) {
        super.activate(event, input);
        if (!input.paused) {
            this.tokenList.add(this.item);
        }
    }

    /** @param {UIEvent} event */
    deactivate(event, input = InputManager.instance) {
        super.deactivate(event, input);
        if (!input.paused) {
            this.tokenList.remove(this.item);
        }
    }
}

export class VKeyAction extends InputAction {
    virtualKey = Symbol(`VKey${this.name}`);

    /** @param {string} name */
    constructor(name, disabled=false) {
        super(name, false, disabled);

    }

    activate(event, input = InputManager.instance) {
        super.activate(event, input);
        input.setKeyState(this.virtualKey, true, event);
    }

    deactivate(event, input = InputManager.instance) {
        input.setKeyState(this.virtualKey, false, event);
        super.deactivate(event, input);
    }
}

export class CallbackAction extends InputAction {
    callback;

    /** @param {ActionFunction} callback */
    constructor(callback, name = callback.name, repeatable = true, disabled = false) {
        super(name, repeatable, disabled);
        this.callback = callback;
    }

    activate(event, input = InputManager.instance) {
        super.activate(event, input);
        if (!input.paused) {
            this.callback(event);
        }
    }

    repeat(input = InputManager.instance) {
        if (!input.paused) {
            this.callback(null);
        }
    }

}

export class MoveAction extends InputAction {
    /** @type {Record<string, MoveAction>} */
    static moveActions = {};

    static DiagonalOnly = new VKeyAction("Lock diagonal movement", false);
    
    static UP = new this("Move up", 0, -1);
    static RIGHT = new this("Move right", 1, 0);
    static DOWN = new this("Move down", 0, 1);
    static LEFT = new this("Move left", -1, 0);

    static UPLEFT = new this("Move up-left", -1, -1);
    static UPRIGHT = new this("Move up-right", 1, -1);
    static DOWNRIGHT = new this("Move down-right", 1, 1);
    static DOWNLEFT = new this("Move down-left", -1, 1);

    static SURFACE = new this("Surface", 0, 0, 1);
    static DIVE = new this("Dive", 0, 0, -1);
    
    static WAIT = new this("Wait", 0, 0, 0);

    /** @type {UIEvent} */
    static lastMovedEvent;

    /** @readonly */
    dx;
    /** @readonly */
    dy;
    /** @readonly */
    dz;

    /** @readonly */
    isOrthogonal;

    /** @readonly */
    isDiagonal;

    /** @readonly */
    isSurfaceDive;

    /** @private @param {string} name  */
    constructor(name, dx = 0, dy = 0, dz = 0) {
        super(name);
        const key = `${dx},${dy},${dz}`;
        if (new.target.moveActions[key]) {
            return new.target.moveActions[key];
        }
        this.dx = dx;
        this.dy = dy;
        this.dz = dz;
        this.isSurfaceDive = dz !== 0;
        this.isOrthogonal = (dx !== 0 ? 1 : 0) + (dy !== 0 ? 1 : 0) === 1;
        this.isDiagonal = (dx !== 0 ? 1 : 0) + (dy !== 0 ? 1 : 0) === 2;
        new.target.moveActions[key] = this;
    }

    /** @param {UIEvent} event  */
    matchAllowed(event) {
        return super.matchAllowed(event) && (!MoveAction.DiagonalOnly.isActive || this.isDiagonal);
    }

    /** @param {UIEvent} event  */
    activate(event, input = InputManager.instance) {
        super.activate(event, input);
        const {dx, dy, dz} = this;
        if (event) {
            if (event === MoveAction.lastMovedEvent) {
                return;
            }
            MoveAction.lastMovedEvent = event;
        }
        if (!input.paused) {
            input.triggerMoveHandler(dx, dy, dz);
        }
    }

    repeat(input = InputManager.instance) {
        const {dx, dy, dz} = this;
        if (!input.paused) {
            input.triggerMoveHandler(dx, dy, dz);
        }
    }
}

export class ActionBinding {
    /** @type {WeakRef<InputAction>} */
    #action;
    get action() {
        return this.#action?.deref();
    }

    isActive = false;

    #disabled = false;
    get disabled() {
        return this.#disabled;
    }
    set disabled(v) {
        if (v !== this.#disabled) {
            this.#disabled = v;
            if (!this.action.disabled) {
                this.action.checkBindings();
            }
        }
    }
    repeatable = true;

    /** @param {InputAction} action */
    constructor(action) {
        this.#action = new WeakRef(action);
    }

    /** @param {ActionBinding} other */
    equals(other) {
        return !this.action || this.action === other.action;
    }

    /** @param {UIEvent} event  */
    matches(event, input = InputManager.instance) {
        return this.action?.matchAllowed(event) && !this.disabled;
    }

    bind(input = InputManager.instance) {
        input.addBinding(this);
    }

    unbind(input = InputManager.instance) {
        input.removeBinding(this);
    }

    /** @param {UIEvent} event  */
    setActive(event, active=true, input = InputManager.instance) {
        if (active === this.isActive) return active;
        this.isActive = active;
        if (active && !this.action.isActive) {
            this.action.activate(event, input);
        } else if (!active && this.action.isActive && !this.action.hasMatch(event, input)) {
            this.action.deactivate(event, input);
        }
        return active;
    }
}

export class ActionKeyBinding extends ActionBinding {
    /** @type {DOMKeySymbol[]} */
    keys = [];

    /** @param {InputAction} action @param {(DOMKeyCode|DOMKeySymbol)[]} keys  */
    constructor(action, keys) {
        super(action);
        this.keys = keys.map(keySymbol);
    }

    /** @param {ActionBinding} other */
    equals(other) {
        if (!super.equals(other) || !(other instanceof ActionKeyBinding)) return false;
        const {keys} = other;
        if (keys?.length !== this.keys.length) {
            return false;
        }
        return this.keys.every(s => keys.includes(s));
    }

    /** @param {UIEvent} event  */
    matches(event, input = InputManager.instance) {
        if (!super.matches(event, input)) {
            return false;
        }
        const {keysPressed} = input;
        for (const key of this.keys) {
            if (!keysPressed[key]) {
                return false;
            }
        }
        return true;
    }
}

export class ActionCharBinding extends ActionKeyBinding {
    /** @type {string} */
    char;

    /** @type {DOMKeySymbol} */
    activatingKeySym;

    /** @param {InputAction} action @param {string} char @param {(DOMKeyCode|DOMKeySymbol)[]} keys  */
    constructor(action, char, keys) {
        super(action, keys);
        this.char = char;
    }

    /** @param {UIEvent} event  */
    matches(event, input = InputManager.instance) {
        if (!super.matches(event, input)) return false;
        if (event instanceof KeyboardEvent && event.type === "keydown" && event.key === this.char) {
            return true;
        } else if (this.activatingKeySym && input.keysPressed[this.activatingKeySym]) {
            return true;
        }
        return false;
    }

    /** @param {ActionBinding} other */
    equals(other) {
        return other instanceof ActionCharBinding && super.equals(other) && this.char === other.char;
    }

    /** @param {UIEvent} event  */
    setActive(event, active = true, input = InputManager.instance) {
        if (super.setActive(event, active, input) && event instanceof KeyboardEvent && event.key === this.char) {
            this.activatingKeySym = InputManager.isKeyCode(event.code) ? keySymbol(event.code) : null;
        } else if (!this.isActive) {
            this.activatingKeySym = null;
        }
        return this.isActive;
    }
}

/** @param {DOMKeyCode | DOMKeySymbol} code @returns {DOMKeySymbol} */
function keySymbol(code) {
    return typeof code === "symbol" ? code : /** @type {DOMKeySymbol} */(Symbol.for(code));
}

/** @template T=unknown @param {T} valueForTyping @returns {Record<DOMKeySymbol, T>} */
function symbolMap(valueForTyping) {
    // @ts-ignore
    return {__proto__: null};
}
/** @typedef {(event: UIEvent) => any | Promise<any>} ActionFunction */
/** @typedef {Record<DOMKeySymbol, ActionBinding[]>} KeyBindingMap */
/** @typedef {Record<string, ActionBinding[]>} CharBindingMap */

// const domKeySymbol = Symbol("unused, just for typing");
/** @typedef {symbol} DOMKeySymbol */

Object.assign(self, {InputManager, InputAction, CallbackAction, MoveAction, DOMListAction, VKeyAction, ActionBinding, ActionKeyBinding});