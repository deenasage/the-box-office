// SPEC: tickets.md
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityFeed } from "./ActivityFeed";
import { TicketComments } from "./TicketComments";
import { TimeTracker } from "./TimeTracker";

interface TicketActivityTabsProps {
  ticketId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
}

export function TicketActivityTabs({
  ticketId,
  currentUserId,
  currentUserName,
  currentUserRole,
}: TicketActivityTabsProps) {
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  return (
    <Tabs defaultValue="activity" className="space-y-3">
      <TabsList>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="time">Time Logged</TabsTrigger>
      </TabsList>
      <TabsContent value="activity">
        <ActivityFeed ticketId={ticketId} refreshKey={activityRefreshKey} />
      </TabsContent>
      <TabsContent value="comments">
        <TicketComments
          ticketId={ticketId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onCommentAdded={() => setActivityRefreshKey((k) => k + 1)}
        />
      </TabsContent>
      <TabsContent value="time">
        <TimeTracker
          ticketId={ticketId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </TabsContent>
    </Tabs>
  );
}
