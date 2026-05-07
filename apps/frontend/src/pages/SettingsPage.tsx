import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Settings, Shield, CreditCard, Key, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your account and visual preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-2">
          <Card className="p-2 border-border bg-card/40 backdrop-blur-sm">
            <div className="space-y-1">
              {[
                { name: 'Profile', icon: <User className="w-5 h-5 mr-3" />, active: true },
                { name: 'Preferences', icon: <Settings className="w-5 h-5 mr-3" />, active: false },
                { name: 'Security', icon: <Shield className="w-5 h-5 mr-3" />, active: false },
                { name: 'Billing', icon: <CreditCard className="w-5 h-5 mr-3" />, active: false },
                { name: 'API Key', icon: <Key className="w-5 h-5 mr-3" />, active: false },
                { name: 'Notifications', icon: <Bell className="w-5 h-5 mr-3" />, active: false }
              ].map((item) => (
                <Button key={item.name} variant={item.active ? 'secondary' : 'ghost'} className="w-full justify-start font-medium h-10">
                  {item.icon}
                  {item.name}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-legal-gold to-legal-gold-foreground rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">JD</span>
                </div>
                <Button variant="outline" size="sm">Change Avatar</Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue="john.doe@example.com" disabled />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary h-24" defaultValue="Legal professional specializing in corporate contracts." />
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="legal">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="text-destructive">
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div>
                  <h4 className="font-semibold">Delete Account</h4>
                  <p className="text-xs text-muted-foreground">This will permanently delete all your documents and analysis logs.</p>
                </div>
                <Button variant="destructive" size="sm">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
