/**
 * IndiaGridExplorer — The core immersive experience of UrjaSetu.
 * 
 * A full-screen interactive globe focused on India with:
 * - Selectable state boundaries
 * - Smooth camera transitions
 * - Contextual state intelligence panels
 * - Regional grid node visualization
 * - Transmission corridor overlays
 * 
 * This is the primary landing experience after the cinematic Earth intro.
 */

import { IndiaGrid3D } from '../visualization/IndiaGrid3D';

export const IndiaGridExplorer: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#050B14] p-4">
      {/* Main Visualization Area - IndiaGrid3D handles all its own state and interactions */}
      <div className="flex-1 relative">
        <IndiaGrid3D />
      </div>
    </div>
  );
};
