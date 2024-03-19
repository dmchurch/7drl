import { FOV, Path } from "rot-js";
import type PreciseShadowcasting from "rot-js/lib/fov/precise-shadowcasting.js";

// 24 bits for both y and z seems reasonable, but we can't use bitshifts on the merged value
// because JS bitmath is always performed on 32-bit integers. Note that this would cause problems
// if we allowed negative indices, but we don't, so.
const yzMultiplier = 1 << 24;

type Compute3DCallback = (x: number, y: number, z: number) => any;
type Passable3DCallback = (x: number, y: number, z: number) => boolean;

type JoinedYZ = { joinedYZIsNotARealType: "This type is fake and is never used."; };

export function joinYZ(y = 0, z = 0): JoinedYZ {
    // have to use fp math because 48 bits
    return z * yzMultiplier + y as unknown as JoinedYZ;
}
export function getY(yz: JoinedYZ): number {
    // y is in the low 32 so we can retrieve it with just an and
    return (yz as unknown as number) & (yzMultiplier - 1);
}

export function getZ(yz: JoinedYZ): number {
    return ((yz as unknown as number) / yzMultiplier)|0;
}

export function translate3DCallback<R>(callback: (x: number, y: number, z: number) => R): (x: number, y: number) => R {
    return ((x: number, yz: JoinedYZ) => callback(x, getY(yz), getZ(yz))) as unknown as (x: number, y: number) => R;
}

const toYZ: (y: number, z: number) => number = (joinYZ as unknown as (y: number, z: number) => number);

export class Astar3D extends Path.AStar {
    // @ts-ignore
    declare _toY: JoinedYZ;
    // @ts-ignore
    declare _fromY: JoinedYZ;

    get toX() {return this._toX;}
    get toY() {return getY(this._toY);}
    get toZ() {return getZ(this._toY);}

    get fromX() {return this._fromX;}
    get fromY() {return getY(this._fromY);}
    get fromZ() {return getZ(this._fromY);}


    constructor(toX: number, toY: number, toZ: number, callback: Passable3DCallback, options: ConstructorParameters<typeof Path.AStar>[3] = {}) {
        super(toX, toYZ(toY, toZ), translate3DCallback(callback), options);
        // add the z directions
        this._dirs = [...this._dirs, [0, yzMultiplier], [0, -yzMultiplier]];
    }

    setTarget(toX = 0, toY = 0, toZ = 0) {
        this._toX = toX;
        this._toY = joinYZ(toY, toZ);
    }

    compute3D(fromX: number, fromY: number, fromZ: number, callback: Compute3DCallback) {
        return super.compute(fromX, toYZ(fromY, fromZ), translate3DCallback(callback));
    }

    // @ts-ignore
    _distance(x: number, yz: JoinedYZ) {
        const y = getY(yz);
        const z = getZ(yz);
        const h = super._distance(x, toYZ(y, this.fromZ));
        const dist = h + Math.abs(z - this.fromZ) * 2;
        return dist;
    }
}

export class Precise3DShadowcasting extends FOV.PreciseShadowcasting {
    lightPasses: Passable3DCallback;
    lightPassesWrapper: PreciseShadowcasting["_lightPasses"];
    constructor(lightPassesCallback: Passable3DCallback, options?: ConstructorParameters<typeof FOV.PreciseShadowcasting>[1]) {
        super(translate3DCallback(lightPassesCallback), options);
        this.lightPassesWrapper = this._lightPasses;
        this.lightPasses = lightPassesCallback;
    }

    // _getCircle(cx: number, cyz: number, R: number) {
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

    compute3D(x: number, y: number, z: number, R: number, callback: Compute3DCallback) {
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