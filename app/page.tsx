import HomePage from "./HomePage";
import { RowDataPacket } from "mysql2";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fetchQaris = async () => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_DOMAIN}/api/qaris`);
    if(res.ok){
       const data = (await res.json()).data
       return data
    } else
      return []
  } catch (error) {
    return []
  }
}

const Home = () => {
  let Qaris = fetchQaris()

  return (
    <HomePage fetchedQaris={Qaris} />
  )
}

export default Home
