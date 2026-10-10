import { notFound } from "next/navigation";
import { EventDetails } from "@/components/EventDetails";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    notFound();
  }

  return <EventDetails eventId={eventId} />;
}
