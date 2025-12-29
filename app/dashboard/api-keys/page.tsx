"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Key, Plus, Copy, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateTime } from "@/lib/utils"

interface ApiKey {
  id: string
  key: string
  name: string
  appName: string | null
  rateLimit: number
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
  isActive: boolean
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [newKeyData, setNewKeyData] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    name: "",
    appName: "",
    rateLimit: "1000",
    expiresAt: "",
  })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/api-keys")
      const data = await response.json()

      if (data.success) {
        setApiKeys(data.data.apiKeys)
      } else {
        toast.error("Failed to fetch API keys")
      }
    } catch (error) {
      toast.error("Failed to fetch API keys")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          appName: formData.appName || undefined,
          rateLimit: parseInt(formData.rateLimit),
          expiresAt: formData.expiresAt || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewKeyData(data.data.apiKey)
        setShowCreateDialog(false)
        setShowKeyDialog(true)
        setFormData({ name: "", appName: "", rateLimit: "1000", expiresAt: "" })
        fetchApiKeys()
      } else {
        toast.error(data.error || "Failed to create API key")
      }
    } catch (error) {
      toast.error("Failed to create API key")
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/admin/api-keys/${deleteId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("API key deleted successfully")
        fetchApiKeys()
      } else {
        toast.error(data.error || "Failed to delete API key")
      }
    } catch (error) {
      toast.error("Failed to delete API key")
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`API key ${!isActive ? "activated" : "deactivated"}`)
        fetchApiKeys()
      } else {
        toast.error(data.error || "Failed to update API key")
      }
    } catch (error) {
      toast.error("Failed to update API key")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedKeys)
    if (newRevealed.has(id)) {
      newRevealed.delete(id)
    } else {
      newRevealed.add(id)
    }
    setRevealedKeys(newRevealed)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Key className="mr-3 h-8 w-8" />
            API Keys
          </h1>
          <p className="text-muted-foreground">
            Manage API keys for external applications
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate New Key
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Key</th>
                <th className="px-4 py-3 text-left text-sm font-medium">App</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Rate Limit</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Usage</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No API keys found. Create one to get started.
                  </td>
                </tr>
              ) : (
                apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{apiKey.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Created {formatDateTime(apiKey.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {revealedKeys.has(apiKey.id) ? apiKey.key : apiKey.key}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {apiKey.appName || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {apiKey.rateLimit}/hr
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant="outline">{apiKey.usageCount.toLocaleString()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={apiKey.isActive ? "success" : "destructive"}>
                        {apiKey.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(apiKey.id, apiKey.isActive)}
                        >
                          {apiKey.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external applications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Production App"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appName">Application Name</Label>
              <Input
                id="appName"
                placeholder="Flutter OCR App"
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={formData.rateLimit}
                onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name}>
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show New Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Save this key now - you won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          {newKeyData && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <code className="text-sm font-mono break-all">{newKeyData.key}</code>
              </div>
              <Button
                onClick={() => copyToClipboard(newKeyData.key)}
                className="w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>
              I've Saved the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone.
              All applications using this key will lose access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
