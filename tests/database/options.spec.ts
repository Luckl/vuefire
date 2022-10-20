import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { rtdbPlugin, DatabasePluginOptions } from '../../src'
import { setupDatabaseRefs } from '../utils'
import { push } from 'firebase/database'

const component = defineComponent({ template: 'no' })

describe('RTDB: plugin options', () => {
  const { databaseRef } = setupDatabaseRefs()

  it('allows customizing $rtdbBind', () => {
    const wrapper = mount(component, {
      global: {
        plugins: [
          [
            rtdbPlugin,
            {
              bindName: '$myBind',
              unbindName: '$myUnbind',
            },
          ],
        ],
      },
    })
    expect(typeof (wrapper.vm as any).$myBind).toBe('function')
    expect(typeof (wrapper.vm as any).$myUnbind).toBe('function')
  })

  it('calls custom serialize function with a ref', async () => {
    const pluginOptions: DatabasePluginOptions = {
      serialize: vi.fn(() => ({ foo: 'bar' })),
    }
    const { vm } = mount(
      {
        template: 'no',
        data: () => ({ items: [] }),
      },
      {
        global: {
          plugins: [[rtdbPlugin, pluginOptions]],
        },
      }
    )

    const itemListRef = databaseRef()

    const p = vm.$rtdbBind('items', itemListRef)
    push(itemListRef, { text: 'foo' })

    await p

    expect(pluginOptions.serialize).toHaveBeenCalledTimes(1)
    expect(pluginOptions.serialize).toHaveBeenCalledWith(
      expect.objectContaining({ val: expect.any(Function) })
    )
    expect(vm.items).toEqual([{ foo: 'bar' }])
  })

  it('can override serialize with local option', async () => {
    const pluginOptions = {
      serialize: vi.fn(() => ({ foo: 'bar' })),
    }

    const items = databaseRef()
    const { vm } = mount(
      {
        template: 'no',
        data: () => ({ items: [] }),
      },
      {
        global: {
          plugins: [[rtdbPlugin, pluginOptions]],
        },
      }
    )

    const spy = vi.fn(() => ({ bar: 'bar' }))

    vm.$rtdbBind('items', items, { serialize: spy })
    await push(items, { text: 'foo' })

    expect(pluginOptions.serialize).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ val: expect.any(Function) })
    )
    expect(vm.items).toEqual([{ bar: 'bar' }])
  })
})
