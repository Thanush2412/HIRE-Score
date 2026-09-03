import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const host = process.env.DB_HOST || "82.25.111.19";
const user = process.env.DB_USER || "u461595815_hirescore";
const password = process.env.DB_PASSWORD || "hireScore-admin1";
const database = process.env.DB_NAME || "u461595815_Hirescore";
const port = parseInt(process.env.DB_PORT || "3306");

// The 6 Excluded Students per user request
const EXCLUDED_STUDENTS = new Set([
  "2022408004", // Abhishek M
  "2022408082", // Akhil Krishna S
  "2022408081", // Aryan Sunil Ghadege
  "2022408092", // Ribhu Sharad
  "2022408085", // Adona Alias
  "2022408097"  // Alvin K Saji
]);

const BASELINE_STUDENTS = [
  // Alliance University (33)
  { group: "Alliance University", name: "AMINA khatoon", regNo: "2511022250006", dept: "MCA" },
  { group: "Alliance University", name: "ATHISH M", regNo: "2511022250007", dept: "MCA" },
  { group: "Alliance University", name: "VIJENDRA KUMAR JHA", regNo: "2511022250010", dept: "MCA" },
  { group: "Alliance University", name: "MOSES", regNo: "2511022250011", dept: "MCA" },
  { group: "Alliance University", name: "MOHAMED ANAS K R", regNo: "2511022250017", dept: "MCA" },
  { group: "Alliance University", name: "Maharshi Goswami", regNo: "2511022250018", dept: "MCA" },
  { group: "Alliance University", name: "ASHISH KUMAR", regNo: "2511022250020", dept: "MCA" },
  { group: "Alliance University", name: "PATRICK IMMANUEL DAVID N", regNo: "2511022250026", dept: "MCA" },
  { group: "Alliance University", name: "VISHAL KUMAR", regNo: "2511022250027", dept: "MCA" },
  { group: "Alliance University", name: "ANURAG SAHAY", regNo: "2511022250029", dept: "MCA" },
  { group: "Alliance University", name: "ANURAG KUMAR", regNo: "2511022250033", dept: "MCA" },
  { group: "Alliance University", name: "PRAVIN SINGH RAJBHAR", regNo: "2511022250034", dept: "MCA" },
  { group: "Alliance University", name: "YASH ARYAN", regNo: "2511022250035", dept: "MCA" },
  { group: "Alliance University", name: "VISHALLINI J S", regNo: "2511022250043", dept: "MCA" },
  { group: "Alliance University", name: "RAKSHA SAVANTH L", regNo: "2511022250046", dept: "MCA" },
  { group: "Alliance University", name: "PRITHEW V C", regNo: "2511022250052", dept: "MCA" },
  { group: "Alliance University", name: "GODSON C", regNo: "2511022250053", dept: "MCA" },
  { group: "Alliance University", name: "Kishore A", regNo: "2511022250054", dept: "MCA" },
  { group: "Alliance University", name: "R RAJESH", regNo: "2511022250059", dept: "MCA" },
  { group: "Alliance University", name: "SYED Muntazar Mehdi", regNo: "2511022250060", dept: "MCA" },
  { group: "Alliance University", name: "HARSHITH REDDY O", regNo: "2511022250061", dept: "MCA" },
  { group: "Alliance University", name: "ADITH PRAKASH", regNo: "2511022250062", dept: "MCA" },
  { group: "Alliance University", name: "NITHISH N", regNo: "2511022250066", dept: "MCA" },
  { group: "Alliance University", name: "THARUN T", regNo: "2511022250072", dept: "MCA" },
  { group: "Alliance University", name: "Biswajit Sahoo", regNo: "2511022250073", dept: "MCA" },
  { group: "Alliance University", name: "VALLEPU BALAJI", regNo: "2511022250077", dept: "MCA" },
  { group: "Alliance University", name: "PUNITH M", regNo: "2511022250078", dept: "MCA" },
  { group: "Alliance University", name: "PRAJWAL CHIDANANDA KAVADIAMTTI", regNo: "2511022250087", dept: "MCA" },
  { group: "Alliance University", name: "MOHAMMED SHABAZ KHAN", regNo: "2511022250091", dept: "MCA" },
  { group: "Alliance University", name: "BHAVANA R", regNo: "2511022250096", dept: "MCA" },
  { group: "Alliance University", name: "ABHISHEK DINESH SHET", regNo: "2511022250098", dept: "MCA" },
  { group: "Alliance University", name: "L PRAJWAL", regNo: "2511022250099", dept: "MCA" },
  { group: "Alliance University", name: "ULLAS GOWDA Bu", regNo: "2511022250100", dept: "MCA" },

  // AMET (4)
  { group: "AMET", name: "Naveen Kumar M", regNo: "ASML24049", dept: "B.Sc. AI-ML" },
  { group: "AMET", name: "Vishnu K", regNo: "ASML24051", dept: "B.Sc. AI-ML" },
  { group: "AMET", name: "Sarath s", regNo: "ASML24053", dept: "B.Sc. AI-ML" },
  { group: "AMET", name: "Sriram Dharmaraj", regNo: "ASML24035", dept: "B.Sc. AI-ML" },

  // Takshashila (6)
  { group: "Takshashila", name: "Anbarasan D", regNo: "TU6243202111003", dept: "BSC AI & ML" },
  { group: "Takshashila", name: "Gokul V", regNo: "TU6243202111018", dept: "BSC AI & ML" },
  { group: "Takshashila", name: "Iyyappan V", regNo: "TU6243202111021", dept: "BSC AI & ML" },
  { group: "Takshashila", name: "Kishore G", regNo: "TU-6243202111028", dept: "BSC AI & ML" },
  { group: "Takshashila", name: "Ravichandar R", regNo: "TU6243202111039", dept: "BSC AI & ML" },
  { group: "Takshashila", name: "Manojan S", regNo: "TU6243202111031", dept: "BSC CS - AI" },

  // STC (1)
  { group: "STC", name: "Naveen Kumar S", regNo: "25MCA027", dept: "MCA" },

  // TERF's (1)
  { group: "TERF's", name: "Lingeswaran S", regNo: "2426J0633", dept: "BSC IT" },

  // BCAS (3)
  { group: "BCAS", name: "Janani R", regNo: "2426K0113", dept: "Bsc CT" },
  { group: "BCAS", name: "Rubasree K", regNo: "2426K0125", dept: "Bsc CT" },
  { group: "BCAS", name: "Vinith D", regNo: "2426K0134", dept: "Bsc CT" },

  // S-Vyasa (21)
  { group: "S-Vyasa", name: "Aadith Raj T", regNo: "2022408002", dept: "BCA" },
  { group: "S-Vyasa", name: "Abhishek M", regNo: "2022408004", dept: "BCA" },
  { group: "S-Vyasa", name: "Afllah A K", regNo: "2022408006", dept: "BCA" },
  { group: "S-Vyasa", name: "Aumkaar Venkit", regNo: "2022408014", dept: "BCA" },
  { group: "S-Vyasa", name: "Goutham M R", regNo: "2022408020", dept: "BCA" },
  { group: "S-Vyasa", name: "Kanishkar K", regNo: "2022408024", dept: "BCA" },
  { group: "S-Vyasa", name: "Monish D N", regNo: "2022408029", dept: "BCA" },
  { group: "S-Vyasa", name: "N Bhushan", regNo: "2022408036", dept: "BCA" },
  { group: "S-Vyasa", name: "Sanskrut C Kodabagi", regNo: "2022408070", dept: "BCA" },
  { group: "S-Vyasa", name: "Syed Raiyan Hasan A", regNo: "2022408078", dept: "BCA" },
  { group: "S-Vyasa", name: "Yogesh L", regNo: "2022408080", dept: "BCA" },
  { group: "S-Vyasa", name: "Aryan Sunil Ghadege", regNo: "2022408081", dept: "BCA" },
  { group: "S-Vyasa", name: "Akhil Krishna S", regNo: "2022408082", dept: "BCA" },
  { group: "S-Vyasa", name: "Dhanudevadath Manoj Vineetha", regNo: "2022408083", dept: "BCA" },
  { group: "S-Vyasa", name: "Adona Alias", regNo: "2022408085", dept: "BCA" },
  { group: "S-Vyasa", name: "Shreyas M R", regNo: "2022408086", dept: "BCA" },
  { group: "S-Vyasa", name: "Ribhu Sharad", regNo: "2022408092", dept: "BCA" },
  { group: "S-Vyasa", name: "Ayush Gowda", regNo: "2022408095", dept: "BCA" },
  { group: "S-Vyasa", name: "Alvin K Saji", regNo: "2022408097", dept: "BCA" },
  { group: "S-Vyasa", name: "Aleena Joji", regNo: "2022408102", dept: "BCA" },
  { group: "S-Vyasa", name: "Mohammed Rizwan Niyas K", regNo: "2022408103", dept: "BCA" }
];

export async function GET() {
  let conn;
  try {
    conn = await mysql.createConnection({ host, user, password, database, port });
    const [dbStudents]: [any[], any] = await conn.query(
      "SELECT id, name, registrationNumber, college, department, year, created_at FROM student_full_view"
    );

    const activeBaseline = BASELINE_STUDENTS.filter(s => !EXCLUDED_STUDENTS.has(s.regNo));

    const checkedList = activeBaseline.map(item => {
      const targetReg = (item.regNo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetCleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");

      let matches = dbStudents.filter(s => {
        const dbReg = (s.registrationNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return dbReg && dbReg === targetReg;
      });

      if (matches.length === 0) {
        matches = dbStudents.filter(s => {
          const cleanDbName = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanDbName === targetCleanName) return true;
          const tokens = item.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(t => t.length > 1);
          if (tokens.length > 0 && tokens.every(t => cleanDbName.includes(t))) {
            const dbCol = (s.college || "").toLowerCase();
            const grpKey = item.group.toLowerCase().replace(/[^a-z]/g, "");
            if (dbCol.includes(grpKey)) return true;
          }
          return false;
        });
      }

      const inDb = matches.length > 0;
      const dbStudent = inDb ? matches[0] : null;

      return {
        group: item.group,
        name: item.name,
        regNo: item.regNo,
        dept: dbStudent ? dbStudent.department : item.dept,
        inDb
      };
    });

    const missingOnly = checkedList.filter(s => !s.inDb);
    const presentOnly = checkedList.filter(s => s.inDb);

    const groupedMissing: Record<string, any[]> = {};
    missingOnly.forEach(item => {
      if (!groupedMissing[item.group]) groupedMissing[item.group] = [];
      groupedMissing[item.group].push(item);
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalDbRecords: dbStudents.length,
      totalTracked: activeBaseline.length,
      totalPresent: presentOnly.length,
      totalMissing: missingOnly.length,
      groupedMissing,
      missingOnly
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, max-age=0"
      }
    });

  } catch (err: any) {
    console.error("Live DB Query Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
