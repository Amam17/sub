// app/admin/support/[id]/page.tsx
import { TicketThread } from "@/components/support/TicketThread";

export default function AdminTicketPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-2xl">
      <TicketThread ticketId={params.id} isStaff />
    </div>
  );
}
