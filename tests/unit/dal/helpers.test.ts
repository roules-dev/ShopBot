import { describe, it, expect, vi } from 'vitest';
import { update, update2 } from '@/database/helpers';


describe('DAL helpers', () => {
    it('should update the field of an object (without handler)', () => {
        const obj = { a: 1 }
        update(obj, { a: 2 })
        expect(obj).toEqual({ a: 2 })
    })

    it('should update the field of an object (with handler)', () => {
        const obj = { a: 1 }
        const handler = (value: number) => value == -1 ? undefined : value

        update(obj, { a: -1 }, { a: handler })
        expect(obj).toEqual({ a: undefined })

    })
})