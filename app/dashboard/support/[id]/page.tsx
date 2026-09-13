// app/dashboard/support/[id]/page.tsx
import { TicketThread } from "@/components/support/TicketThread";

export default function CustomerTicketPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-2xl">
      <TicketThread ticketId={params.id} isStaff={false} />
    </div>
  );
}
