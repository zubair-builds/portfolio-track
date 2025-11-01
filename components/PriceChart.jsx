import ChartClient from './ChartClient';

export default function PriceChart({ stockIndexData }) {
  const formattedData = stockIndexData.map(([timestamp, price, volume]) => ({
    time: timestamp, // Convert milliseconds to seconds
    value: price,
  }));

  const sortedData = formattedData.sort((a, b) => a.time - b.time);

  return (
    <div>
      <ChartClient data={sortedData} />
    </div>
  );
}
