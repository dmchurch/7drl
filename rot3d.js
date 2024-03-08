import { FOV, Path } from "rot-js";

// 24 bits for both y and z seems reasonable, but we can't use bitshifts on the merged value
// because JS bitmath is always performed on 32-bit integers. Note that this would cause problems
// if we allowed negative indices, but we don't, so.
const yzMultiplier = 1 << 24;

/** @typedef {(x: number, y: number, z: number) => any} Compute3DCallback */
/** @typedef {(x: number, y: number, z: number) => boolean} Passable3DCallback */

/** @typedef {{joinedYZIsNotARealType: "This type is fake and is never used."}} JoinedYZ */

/** @returns {JoinedYZ} */
export function joinYZ(y = 0, z = 0) {
    // have to use fp math because 48 bits
    // @ts-ignore
    return z * yzMultiplier + y;
}
/** @param {JoinedYZ} yz @returns {number} */
export function getY(yz) {
    // y is in the low 32 so we can retrieve it with just an and
    // @ts-ignore
    return yz & (yzMultiplier - 1);
}
/** @param {JoinedYZ} yz @returns {number} */
export function getZ(yz) {
    // @ts-ignore
    return (yz / yzMultiplier)|0;
}

/** @template R @param {(x: number, y: number, z: number) => R} callback @returns {(x: number, y: number) => R} */
export function translate3DCallback(callback) {
    // @ts-ignore
    return (x, yz) => callback(x, getY(yz), getZ(yz));
}

/** @ts-ignore @type {(y: number, z: number) => number} */
const toYZ = joinYZ;


export class Astar3D extends Path.AStar {
    /** @ts-ignore @type {JoinedYZ} */
    _toY = this["_toY"];

    get toX() {return this._toX;}
    get toY() {return getY(this._toY);}
    get toZ() {return getZ(this._toY);}

    /** @param {number} toX @param {number} toY @param {number} toZ @param {Passable3DCallback} callback @param {ConstructorParameters<typeof Path.AStar>[3]} options */
    constructor(toX, toY, toZ, callback, options = {}) {
        super(toX, toYZ(toY, toZ), translate3DCallback(callback), options);
        // add the z directions
        this._dirs = [...this._dirs, [0, yzMultiplier], [0, -yzMultiplier]];
    }

    /** @param {number} fromX @param {number} fromY @param {number} fromZ @param {Compute3DCallback} callback */
    compute3D(fromX, fromY, fromZ, callback) {
        return super.compute(fromX, toYZ(fromY, fromZ), translate3DCallback(callback));
    }
}

export class Precise3DShadowcasting extends FOV.PreciseShadowcasting {
    lightPasses;
    lightPassesWrapper;
    /** @param {Passable3DCallback} lightPassesCallback @param {ConstructorParameters<typeof FOV.PreciseShadowcasting>[1]} options */
    constructor(lightPassesCallback, options) {
        super(translate3DCallback(lightPassesCallback), options);
        this.lightPassesWrapper = this._lightPasses;
        this.lightPasses = lightPassesCallback;
    }

    // /** @param {number} cx @param {number} cyz @param {number} R  */
    // _getCircle(cx, cyz, R) {
    //     const expectedLength = R * (2 * R - 1) * 8 + 2;
    //     const result = new Array(expectedLength);
        
    //     let index = 0;
    //     let yz = cyz + yzMultiplier * R;

    //     result[index++] = [cx, yz];

    //     for (let r = R - 1; r > -R; r--) {
    //         yz -= yzMultiplier;
    //         const layer = super._getCircle(cx, yz, R - r);
    //         const {length} = layer;
    //         for (let i = 0; i < length; i++) {
    //             result[index++] = layer[i];
    //         }
    //     }

    //     yz -= yzMultiplier;
    //     result[index++] = [cx, yz];
    //     if (index !== expectedLength) {
    //         console.warn(`Unexpected sphere length ${index} != ${expectedLength}`, cx, cyz, R);
    //     }

    //     return result;
    // }

    /** @param {number} x @param {number} y @param {number} z @param {number} R @param {Compute3DCallback} callback */
    compute3D(x, y, z, R, callback) {
        // return super.compute(x, toYZ(y, z), R, translate3DCallback(callback));
        super.compute(x, toYZ(y, z), R, translate3DCallback((vx, vy, vz)  => {
            callback(vx, vy, vz);
            for (let r = 1, z = vz; r <= R; r++) {
                z++;
                callback(vx, vy, z);
                if (!this.lightPasses(vx, vy, z)) {
                    break;
                }
            }
            for (let r = 1, z = vz; r <= R; r++) {
                z--;
                callback(vx, vy, z);
                if (!this.lightPasses(vx, vy, z)) {
                    break;
                }
            }
        }));
    }
}

Object.assign(self, {Astar3D, Precise3DShadowcasting, joinYZ, getY, getZ});