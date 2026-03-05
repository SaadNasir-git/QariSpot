import getDatabaseConnection from "@/lib/mysql2";
import HomePage from "./HomePage";
import { RowDataPacket } from "mysql2";

const fetchQaris = async () => {
  try {
    const conn = await getDatabaseConnection();
    const [data] = await conn.query<RowDataPacket[] & qari[]>('SELECT * FROM qari');
    return data
  } catch (error) {
    console.log(error)
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
