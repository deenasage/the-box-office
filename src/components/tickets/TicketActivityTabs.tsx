// SPEC: tickets.md
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityFeed } from "./ActivityFeed";
import { TicketComments } from "./TicketComments";
import { TicketTimeline, type TimelineEntry } from "./TicketTimeline";

interface TicketActivityTabsProps {
  ticketId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  timelineEntries: TimelineEntry[];
  createdAt: string;
}

export function TicketActivityTabs({
  ticketId,
  currentUserId,
  currentUserName,
  timelineEntries,
  createdAt,
}: TicketActivityTabsProps) {
  const [activityKey, setActivityKey] = useState(0);

  return (
    <Tabs defaultValue="activity" className="space-y-3">
      <TabsList variant="line" className="w-full justify-start border-b rounded-none pb-0 h-auto gap-0">
        <TabsTrigger value="activity"  className="px-4 py-2 rounded-none">Activity</TabsTrigger>
        <TabsTrigger value="comments"  className="px-4 py-2 rounded-none">Comments</TabsTrigger>
        <TabsTrigger value="timeline"  className="px-4 py-2 rounded-none">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="activity">
        <ActivityFeed ticketId={ticketId} refreshKey={activityKey} />
      </TabsContent>

      <TabsContent value="comments">
        <TicketComments
          ticketId={ticketId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onCommentAdded={() => setActivityKey((k) => k + 1)}
        />
      </TabsContent>

      <TabsContent value="timeline">
        <TicketTimeline entries={timelineEntries} createdAt={createdAt} />
      </TabsContent>
    </Tabs>
  );
}
