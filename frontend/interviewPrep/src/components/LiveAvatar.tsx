import React, { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    VideoConference,
    formatDuration,
    useTokenCustomization,
    TrackReference,
} from '@livekit/components-react';
import { Brain } from 'lucide-react';

interface LiveAvatarProps {
    token: string;
    serverUrl: string;
    isListening?: boolean;
}

export function LiveAvatar({ token, serverUrl, isListening }: LiveAvatarProps) {
    if (!token) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-[#161b22]">
                <div className="text-center">
                    <div className="size-48 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                        <Brain className="size-24 text-gray-600" />
                    </div>
                    <p className="mt-4 text-gray-500">Connecting to AI...</p>
                </div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={serverUrl}
            connect={true}
            className="absolute inset-0 bg-gradient-to-br from-[#1f6feb]/20 to-[#8250df]/20 flex items-center justify-center"
        >
            <div className="relative">
                <div
                    className={`size-48 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#bc8cff] flex items-center justify-center transition-transform duration-300 ${isListening ? 'scale-110' : 'scale-100'
                        }`}
                >
                    <Brain className="size-24 text-white" />
                </div>

                {/* Listening Indicator */}
                {isListening && (
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center gap-2 bg-[#1f6feb] text-white px-4 py-2 rounded-md border border-[#1f6feb]/40 whitespace-nowrap">
                            <div className="flex gap-1">
                                <div className="size-1 bg-white rounded-full animate-pulse" />
                                <div className="size-1 bg-white rounded-full animate-pulse delay-75" />
                                <div className="size-1 bg-white rounded-full animate-pulse delay-150" />
                            </div>
                            <span className="text-sm">AI is listening...</span>
                        </div>
                    </div>
                )}
            </div>
        </LiveKitRoom>
    );
}
