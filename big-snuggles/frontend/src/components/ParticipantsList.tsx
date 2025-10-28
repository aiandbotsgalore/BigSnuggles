/**
 * Participants List Component
 * 
 * Real-time list of users in the room with status indicators
 */

import React from 'react';
import { Users, Crown, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';

interface Participant {
  userId: string;
  displayName: string;
  socketId: string;
  joinedAt: string;
}

interface ParticipantsListProps {
  participants: Participant[];
  hostUserId: string;
  currentUserId: string;
  maxParticipants: number;
}

export default function ParticipantsList({
  participants,
  hostUserId,
  currentUserId,
  maxParticipants
}: ParticipantsListProps) {
  const participantCount = participants.length;

  return (
    <Card className="bg-neutral-800/50 border-purple-500/20 h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-400" />
            Participants
          </div>
          <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
            {participantCount}/{maxParticipants}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-400px)] pr-4">
          <div className="space-y-2">
            {participants.length === 0 ? (
              <p className="text-neutral-400 text-sm text-center py-8">
                No participants yet
              </p>
            ) : (
              participants.map((participant) => (
                <div
                  key={participant.socketId}
                  className={`
                    flex items-center justify-between p-3 rounded-lg
                    ${participant.userId === currentUserId 
                      ? 'bg-purple-600/20 border border-purple-500/30' 
                      : 'bg-neutral-700/50'
                    }
                    transition-all
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {/* Online Status Indicator */}
                    <Circle className="w-3 h-3 text-green-400 fill-green-400" />
                    
                    {/* Display Name */}
                    <span className="font-medium text-white">
                      {participant.displayName}
                      {participant.userId === currentUserId && (
                        <span className="text-xs text-purple-400 ml-2">(You)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Host Badge */}
                    {participant.userId === hostUserId && (
                      <Badge 
                        variant="outline" 
                        className="text-xs border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        Host
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Capacity Warning */}
        {participantCount >= maxParticipants && (
          <div className="mt-4 p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-medium text-center">
              Room is at full capacity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
