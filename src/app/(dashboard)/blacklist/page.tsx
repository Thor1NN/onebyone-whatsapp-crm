"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ShieldBan, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string | null;
  phoneNumber: string;
  blacklistReason: string | null;
  blacklistDate: string | null;
}

export default function BlacklistPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlacklisted = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts?blacklisted=true&limit=200");
      const data = await res.json();
      if (data.success) setContacts(data.data.contacts);
    } catch {
      toast.error("Failed to load blacklist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklisted();
  }, [fetchBlacklisted]);

  const handleRemove = async (contactId: string) => {
    if (!confirm("Remove from blacklist?")) return;
    try {
      await fetch("/api/contacts/blacklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      toast.success("Removed from blacklist");
      fetchBlacklisted();
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Blacklist" description="Contacts that will never receive messages" />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShieldBan className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Blacklist is empty</h3>
              <p className="text-sm text-muted-foreground mt-1">No contacts are currently blacklisted</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name || "—"}</TableCell>
                    <TableCell>{c.phoneNumber}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.blacklistReason || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.blacklistDate ? new Date(c.blacklistDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(c.id)}>
                        <UserMinus className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
