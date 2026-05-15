"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Upload, Search, ShieldBan, CheckCircle2, XCircle, Users, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string | null;
  phoneNumber: string;
  countryCode: string | null;
  company: string | null;
  telegramChatId: string | null;
  optInStatus: boolean;
  isBlacklisted: boolean;
  createdAt: string;
  tags: Array<{ tag: { id: string; name: string; color: string } }>;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [newContact, setNewContact] = useState({
    name: "",
    phoneNumber: "",
    countryCode: "",
    company: "",
    notes: "",
    optInStatus: false,
    optInSource: "",
  });

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.data.contacts);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      }
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = async () => {
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Contact added");
      setShowAddDialog(false);
      setNewContact({ name: "", phoneNumber: "", countryCode: "", company: "", notes: "", optInStatus: false, optInSource: "" });
      fetchContacts();
    } catch {
      toast.error("Failed to add contact");
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch("/api/contacts/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success(`Created: ${data.data.created}, Skipped: ${data.data.skipped}, Invalid: ${data.data.invalid}`);
        setShowUploadDialog(false);
        fetchContacts();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleBlacklist = async (contactId: string) => {
    if (!confirm("Blacklist this contact? They will no longer receive messages.")) return;
    try {
      await fetch("/api/contacts/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, reason: "Manually blacklisted" }),
      });
      toast.success("Contact blacklisted");
      fetchContacts();
    } catch {
      toast.error("Failed to blacklist");
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const avatarColor = (name: string | null) => {
    if (!name) return "bg-zinc-200 text-zinc-600";
    const colors = [
      "bg-emerald-100 text-emerald-700",
      "bg-blue-100 text-blue-700",
      "bg-purple-100 text-purple-700",
      "bg-amber-100 text-amber-700",
      "bg-rose-100 text-rose-700",
      "bg-cyan-100 text-cyan-700",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description={`${total.toLocaleString()} ${total === 1 ? "contact" : "contacts"} in your database`}>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Contacts</DialogTitle>
              <DialogDescription>
                Upload a CSV or Excel file. Required columns: phone_number. Optional: name, country_code, tags, opt_in_status, notes
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input id="file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryCode">Default Country Code</Label>
                <Input id="countryCode" name="countryCode" placeholder="+971" />
              </div>
              <DialogFooter>
                <Button type="submit">Upload</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription>Add a new contact manually</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input value={newContact.phoneNumber} onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })} required placeholder="+971501234567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country Code</Label>
                  <Input placeholder="+971" value={newContact.countryCode} onChange={(e) => setNewContact({ ...newContact, countryCode: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} placeholder="Acme Inc" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Opt-in Source</Label>
                <Input placeholder="Website form, Event signup, etc." value={newContact.optInSource} onChange={(e) => setNewContact({ ...newContact, optInSource: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Switch checked={newContact.optInStatus} onCheckedChange={(v) => setNewContact({ ...newContact, optInStatus: v })} />
                <Label className="text-sm">Contact has opted in to receive messages</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddContact}>Add Contact</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <div className="border-b p-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or company..."
              className="pl-10 h-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No contacts yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Add contacts manually, upload a CSV, or extract members from a Telegram group
              </p>
              <div className="flex gap-2 mt-5">
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add manually
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-1.5" /> Upload CSV
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Opt-in</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${avatarColor(contact.name)}`}>
                            {getInitials(contact.name)}
                          </div>
                          <div>
                            <p className="font-medium">{contact.name || "Unnamed"}</p>
                            {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {contact.phoneNumber.startsWith("tg_") ? "—" : contact.phoneNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {!contact.phoneNumber.startsWith("tg_") && (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold" title="WhatsApp">
                              W
                            </span>
                          )}
                          {contact.telegramChatId && (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold" title="Telegram">
                              T
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.optInStatus ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.slice(0, 2).map((ct) => (
                            <Badge key={ct.tag.id} variant="secondary">{ct.tag.name}</Badge>
                          ))}
                          {contact.tags.length > 2 && <Badge variant="secondary">+{contact.tags.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.isBlacklisted ? (
                          <Badge variant="destructive">Blacklisted</Badge>
                        ) : contact.optInStatus ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="warning">No opt-in</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!contact.isBlacklisted && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleBlacklist(contact.id)}>
                            <ShieldBan className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
