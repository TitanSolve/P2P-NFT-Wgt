import React from "react";
import ParticipantCard from "../../components/participant-card";

const Home = () => {
  const generateNFTs = (count) => Array.from({ length: count }, (_, i) => ({ id: i + 1 }));

  const myNFTs = generateNFTs(8);
  const aliceNFTs = generateNFTs(10);
  const bobNFTs = generateNFTs(10);

  return (
    <div className="p-10">
      <div className="h-[550px] flex items-center justify-center border border-gray-200 rounded-2xl bg-white shadow-lg">
        <div className="h-full overflow-y-auto p-5 bg-gradient-to-br to-gray-100 flex flex-col items-center space-y-2">
          {[
            { title: "My NFTs", nfts: myNFTs, own: true },
            { title: "Alice's NFTs", nfts: aliceNFTs, own: false },
            { title: "A's NFTs", nfts: bobNFTs, own: false },
            { title: "B's NFTs", nfts: bobNFTs, own: false },
            { title: "C's NFTs", nfts: bobNFTs, own: false }
          ].map((participant, index) => (
            <ParticipantCard
              key={index}
              title={participant.title}
              nfts={participant.nfts}
              index={index + 1}
              own={participant.own}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
