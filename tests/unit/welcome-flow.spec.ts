import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/sidepanel/App.vue'
import WelcomeView from '@/sidepanel/views/WelcomeView.vue'
import GeminiApiKeyModal from '@/sidepanel/components/GeminiApiKeyModal.vue'
import Header from '@/sidepanel/components/Header.vue'
import AnalysisView from '@/sidepanel/views/AnalysisView.vue'
import { setupChromeMock } from '../mocks/chrome'
import { useSession, useNavigation, useCVProfile, useAppSettings } from '@/composables/useStorageState'
import { storageService, STORAGE_KEYS } from '@/services/storage'
import { DEFAULT_SETTINGS } from '@/types/settings'

describe('Welcome Flow, Demo Lifecycle & Onboarding Unit Tests', () => {
  beforeEach(async () => {
    setupChromeMock()
    // Reset settings in storage to defaults
    await storageService.set(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS })
    await storageService.remove(STORAGE_KEYS.CV_PROFILE)
    await storageService.remove(STORAGE_KEYS.CURRENT_JOB)
  })

  it('WelcomeView should render app branding, Google Login button, and Demo Mode button', () => {
    const wrapper = mount(WelcomeView)

    expect(wrapper.text()).toContain('Job Seek Assistant')
    expect(wrapper.text()).toContain('Masuk dengan Google')
    expect(wrapper.text()).toContain('Coba Mode Demo')
  })

  it('clicking Coba Mode Demo should activate demo session and switch isSessionActive to true', async () => {
    const { isSessionActive, isDemo } = useSession()
    expect(isSessionActive.value).toBe(false)
    expect(isDemo.value).toBe(false)

    const wrapper = mount(WelcomeView)
    const demoButton = wrapper.findAll('button').find((b) => b.text().includes('Coba Mode Demo'))
    expect(demoButton).toBeDefined()

    await demoButton!.trigger('click')

    expect(isDemo.value).toBe(true)
    expect(isSessionActive.value).toBe(true)
  })

  it('App should display persistent Demo banner with Selesai Demo button across tabs during demo mode', async () => {
    const { startDemoSession, isDemo } = useSession()
    await startDemoSession()
    expect(isDemo.value).toBe(true)

    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Mode Demo Aktif')
    expect(wrapper.text()).toContain('Selesai Demo')

    // Clicking Selesai Demo terminates demo mode
    const finishButton = wrapper.findAll('button').find((b) => b.text().includes('Selesai Demo'))
    expect(finishButton).toBeDefined()
    await finishButton!.trigger('click')

    expect(isDemo.value).toBe(false)
  })

  it('Header should display Demo Sync badge cleanly without crowding other icons', async () => {
    const { startDemoSession } = useSession()
    await startDemoSession()

    const wrapper = mount(Header)
    expect(wrapper.text()).toContain('Demo Sync')
    const headerButtons = wrapper.findAll('button').map((b) => b.text())
    expect(headerButtons.some((txt) => txt.includes('Selesai'))).toBe(false)
  })

  it('ending demo session returns isSessionActive to false (back to WelcomeView)', async () => {
    const { startDemoSession, endDemoSession, isSessionActive } = useSession()

    await startDemoSession()
    expect(isSessionActive.value).toBe(true)

    await endDemoSession()
    expect(isSessionActive.value).toBe(false)
  })

  it('GeminiApiKeyModal should render API key input and emit close on dismiss', async () => {
    const wrapper = mount(GeminiApiKeyModal, {
      props: {
        isOpen: true,
      },
    })

    expect(wrapper.text()).toContain('Konfigurasi Gemini API Key')
    expect(wrapper.text()).toContain('Nanti Saja')

    const dismissButton = wrapper.findAll('button').find((b) => b.text().includes('Nanti Saja'))
    expect(dismissButton).toBeDefined()

    await dismissButton!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('AnalysisView should display prominent CV setup guidance when CV is not yet configured', async () => {
    const { clearCVProfile } = useCVProfile()
    await clearCVProfile()

    const wrapper = mount(AnalysisView)
    expect(wrapper.text()).toContain('Langkah Awal: Atur CV Anda Terlebih Dahulu')
    expect(wrapper.text()).toContain('Buka Menu Profil CV')

    const { activeTab } = useNavigation()
    const cvButton = wrapper.findAll('button').find((b) => b.text().includes('Buka Menu Profil CV'))
    expect(cvButton).toBeDefined()

    await cvButton!.trigger('click')
    expect(activeTab.value).toBe('cv')
  })

  it('handleSessionExpired should set sessionNotice, reset session, and display amber alert banner in WelcomeView', async () => {
    const { isSessionActive, sessionNotice, handleSessionExpired } = useSession()
    const { updateSettings } = useAppSettings()

    // Simulate active Google session
    await updateSettings({ googleAuthStatus: 'connected', googleAccessToken: 'mock_token' })
    expect(isSessionActive.value).toBe(true)

    // Trigger session expired
    await handleSessionExpired('Sesi login Google telah berakhir. Silakan masuk kembali.')

    expect(isSessionActive.value).toBe(false)
    expect(sessionNotice.value).toBe('Sesi login Google telah berakhir. Silakan masuk kembali.')

    // WelcomeView should show the notice
    const wrapper = mount(WelcomeView)
    expect(wrapper.text()).toContain('Sesi login Google telah berakhir. Silakan masuk kembali.')

    // Clicking close button clears the notice
    const closeNoticeBtn = wrapper.find('button[aria-label="Tutup pemberitahuan sesi"]')
    expect(closeNoticeBtn.exists()).toBe(true)
    await closeNoticeBtn.trigger('click')
    expect(sessionNotice.value).toBeNull()
  })

  it('WelcomeView should NOT render manual/advanced Client ID controls to prevent inspection or tampering', () => {
    const wrapper = mount(WelcomeView)

    expect(wrapper.text()).not.toContain('Pengaturan Client ID Lanjutan')
    expect(wrapper.text()).not.toContain('Atur Client ID Manual')
    expect(wrapper.find('input[placeholder*="apps.googleusercontent.com"]').exists()).toBe(false)
  })
})
