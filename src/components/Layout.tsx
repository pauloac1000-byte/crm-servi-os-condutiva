import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useRealtime } from '@/hooks/use-realtime'
import { getDeals } from '@/services/deals'
import { getContacts } from '@/services/contacts'
import { Deal, Contact } from '@/types/crm'
import { DealDetailDrawer } from '@/components/DealDetailDrawer'
import { ContactDetailDrawer } from '@/components/ContactDetailDrawer'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const loadGlobalData = async () => {
    try {
      const [d, c] = await Promise.all([getDeals(), getContacts()])
      setDeals(d)
      setContacts(c)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadGlobalData()
  }, [])

  useRealtime('deals', () => loadGlobalData())
  useRealtime('contacts', () => loadGlobalData())

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <Sidebar onCloseMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <Header
          onOpenMobileSidebar={() => setMobileOpen(true)}
          deals={deals}
          contacts={contacts}
          onSelectDeal={(deal) => setSelectedDeal(deal)}
          onSelectContact={(contact) => setSelectedContact(contact)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>

          <footer className="mx-auto max-w-7xl mt-12 border-t border-slate-200/80 pt-4 pb-6 text-center text-xs text-slate-400">
            <p>Condutiva Tecnologia © {new Date().getFullYear()} — Sistema de Vendas v1.0</p>
          </footer>
        </main>
      </div>

      <DealDetailDrawer
        deal={selectedDeal}
        open={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onUpdated={loadGlobalData}
      />

      <ContactDetailDrawer
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onUpdated={loadGlobalData}
      />
    </div>
  )
}
