import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TabNav from '@/sidepanel/components/TabNav.vue'
import Header from '@/sidepanel/components/Header.vue'
import { setupChromeMock } from '../mocks/chrome'
import { useNavigation } from '@/composables/useStorageState'

describe('SidePanel Components Unit Tests', () => {
  beforeEach(() => {
    setupChromeMock()
  })

  it('TabNav should render all 4 main navigation tabs', () => {
    const wrapper = mount(TabNav)
    const buttons = wrapper.findAll('button')

    expect(buttons.length).toBe(4)
    const buttonTexts = buttons.map((b) => b.text())
    expect(buttonTexts).toContain('Analisa')
    expect(buttonTexts).toContain('Email')
    expect(buttonTexts).toContain('Profil CV')
    expect(buttonTexts).toContain('Pengaturan')
  })

  it('clicking a tab should update activeTab in navigation composable', async () => {
    const wrapper = mount(TabNav)
    const { activeTab } = useNavigation()

    const emailButton = wrapper.findAll('button').find((b) => b.text().includes('Email'))
    expect(emailButton).toBeDefined()

    await emailButton!.trigger('click')
    expect(activeTab.value).toBe('email')

    const settingsButton = wrapper.findAll('button').find((b) => b.text().includes('Pengaturan'))
    await settingsButton!.trigger('click')
    expect(activeTab.value).toBe('settings')
  })

  it('Header should render app title and badges', () => {
    const wrapper = mount(Header)
    expect(wrapper.text()).toContain('Job Seek Assistant')
    expect(wrapper.text()).toContain('No Key')
    expect(wrapper.text()).toContain('No CV')
  })
})
