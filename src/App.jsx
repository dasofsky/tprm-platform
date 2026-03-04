import { useState, useCallback } from 'react'
import { ThemeProvider, AuthProvider, VendorProvider, useTheme, useVendors, useAuth } from './context'
import { Navbar }         from './components/Navbar'
import { OverviewTab, DDTab, RATab, MonitoringTab } from './components/tabs'
import { SettingsPage }   from './components/Settings'
import { VendorDetail }   from './components/VendorDetail'
import { AddVendorModal } from './components/AddVendorModal'

function LoadingScreen() {
  const t = useTheme()
  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, background: '#0f172a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#a5f3fc', fontSize: 22 }}>◈</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: t.text2 }}>Loading TPRM Platform...</div>
      <div style={{ width: 200, height: 3, background: t.border, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: '#6366f1', borderRadius: 999, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

function AppShell() {
  const t = useTheme()
  const { vendors, loading: vendorsLoading, error: vendorsError, addVendor, editVendor } = useVendors()
  const { loading: usersLoading } = useAuth()

  const [tab,      setTab]      = useState('overview')
  const [selected, setSelected] = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)

  const currentVendor = selected ? vendors.find(v => v.id === selected.id) || selected : null

  const handleUpdateVendor = useCallback(async (updated) => {
    const saved = await editVendor(updated)
    setSelected(saved)
  }, [editVendor])

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setSelected(null)
  }

  if (vendorsLoading || usersLoading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: t.bg, transition: 'background .25s' }}>
      <Navbar activeTab={tab} onTabChange={handleTabChange} vendorOpen={!!currentVendor} />

      {/* Show a banner if DB failed and we're on local data */}
      {vendorsError && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fbbf24', padding: '8px 24px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ {vendorsError} Changes will not be saved.
        </div>
      )}

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '26px 22px 56px' }}>
        {currentVendor ? (
          <VendorDetail vendor={currentVendor} onBack={() => setSelected(null)} onUpdate={handleUpdateVendor} />
        ) : (
          <>
            {tab === 'overview'   && <OverviewTab   vendors={vendors} onSelect={setSelected} onAdd={() => setShowAdd(true)} />}
            {tab === 'dd'         && <DDTab          vendors={vendors} onSelect={setSelected} />}
            {tab === 'ra'         && <RATab          vendors={vendors} onSelect={setSelected} />}
            {tab === 'monitoring' && <MonitoringTab  vendors={vendors} onSelect={setSelected} />}
            {tab === 'settings'   && <SettingsPage />}
          </>
        )}
      </div>

      {showAdd && (
        <AddVendorModal
          onClose={() => setShowAdd(false)}
          onAdd={async (v) => { await addVendor(v); setShowAdd(false) }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VendorProvider>
          <AppShell />
        </VendorProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
