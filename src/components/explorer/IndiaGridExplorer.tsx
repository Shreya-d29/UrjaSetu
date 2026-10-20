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

import { useState } from 'react';
import { IndiaGrid3D } from '../visualization/IndiaGrid3D';
import { StateDetailCard, type SelectedStateData } from '../visualization/StateDetailCard';

export const IndiaGridExplorer: React.FC = () => {
  const [selectedState, setSelectedState] = useState<SelectedStateData | null>(null);

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-[#050B14]">
      {/* Globe Section - flexible width */}
      <div className="flex-1 relative p-4">
        <IndiaGrid3D 
          onStateSelect={setSelectedState}
        />
      </div>

      {/* State Detail Panel - fixed width on the right, hidden when no state selected */}
      {selectedState && (
        <div className="w-[340px] h-full border-l border-[#14243A] bg-[#060E1A] flex flex-col overflow-hidden shrink-0">
          <StateDetailCard
            state={selectedState}
            onClose={() => setSelectedState(null)}
          />
        </div>
      )}
    </div>
  );
};
