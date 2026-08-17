const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
require("dotenv").config({ path: ".env.local" });

const allianceStudents = [
  "AMINA khatoon", "ATHISH M", "VIJENDRA KUMAR JHA", "MOSES", "MOHAMED ANAS K R",
  "Maharshi Goswami", "ASHISH KUMAR", "PATRICK IMMANUEL DAVID N", "VISHAL KUMAR", "ANURAG SAHAY",
  "ANURAG KUMAR", "PRAVIN SINGH RAJBHAR", "YASH ARYAN", "VISHALLINI J S", "RAKSHA SAVANTH L",
  "PRITHEW V C", "GODSON C", "Kishore A", "R RAJESH", "SYED Muntazar Mehdi",
  "HARSHITH REDDY O", "ADITH PRAKASH", "NITHISH N", "THARUN T", "Biswajit Sahoo",
  "VALLEPU BALAJI", "PUNITH M", "PRAJWAL CHIDANANDA KAVADIAMTTI", "MOHAMMED SHABAZ KHAN", "BHAVANA R",
  "ABHISHEK DINESH SHET", "L PRAJWAL", "ULLAS GOWDA Bu"
].map(name => ({ collegeGroup: "Alliance University", name }));

const otherColleges = [
  { collegeGroup: "AMET", students: ["Naveen Kumar M", "Vishnu K", "Sarath s", "Sriram Dharmaraj"] },
  { collegeGroup: "Takshashila", students: ["Anbarasan D", "Gokul V", "Iyyappan V", "Kishore G", "Ravichandar R", "Manojan S"] },
  { collegeGroup: "STC", students: ["Naveen Kumar S"] },
  { collegeGroup: "TERF's", students: ["Lingeswaran S"] },
  { collegeGroup: "BCAS", students: ["Janani R", "Rubasree K", "Vinith D"] },
  {
    collegeGroup: "S-Vyasa",
    students: [
      "Aadith Raj T", "Abhishek M", "Afllah A K", "Aumkaar Venkit", "Goutham M R",
      "Kanishkar K", "Monish D N", "N Bhushan", "Sanskrut C Kodabagi", "Syed Raiyan Hasan A",
      "Yogesh L", "Aryan Sunil Ghadege", "Akhil Krishna S", "Dhanudevadath Manoj Vineetha", "Adona Alias",
      "Shreyas M R", "Ribhu Sharad", "Ayush Gowda", "Alvin K Saji", "Aleena Joji",
      "Mohammed Rizwan Niyas K"
    ]
  }
];

const allInput = [];
allianceStudents.forEach(item => allInput.push(item));
otherColleges.forEach(group => {
  group.students.forEach(name => {
    allInput.push({ collegeGroup: group.collegeGroup, name });
  });
});

async function main() {
  const host = process.env.DB_HOST || "82.25.111.19";
  const user = process.env.DB_USER || "u461595815_hirescore";
  const password = process.env.DB_PASSWORD || "hireScore-admin1";
  const database = process.env.DB_NAME || "u461595815_Hirescore";
  const port = parseInt(process.env.DB_PORT || "3306");

  const connection = await mysql.createConnection({ host, user, password, database, port });
  const [allStudentsDb] = await connection.query("SELECT id, name, registrationNumber, college, department, year FROM student_full_view");

  const p = path.join(__dirname, "FPC - FINAL YEAR PLACEMENT TRACKER (2026-2027).xlsx");
  const excelData = [];
  if (fs.existsSync(p)) {
    const wb = XLSX.readFile(p);
    wb.SheetNames.forEach(sheetName => {
      excelData.push({
        sheetName,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 })
      });
    });
  }

  const finalRows = [];

  for (let i = 0; i < allInput.length; i++) {
    const item = allInput[i];
    const sNo = i + 1;
    const colGroup = item.collegeGroup;
    const targetName = item.name.trim();
    const cleanSearchName = targetName.toLowerCase().replace(/[^a-z0-9]/g, "");

    let excelMatch = null;
    excelData.forEach(ed => {
      ed.rows.forEach(row => {
        const rowName = row[1] ? String(row[1]).trim() : "";
        const cleanRowName = rowName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanRowName && (cleanRowName.includes(cleanSearchName) || cleanSearchName.includes(cleanRowName))) {
          excelMatch = {
            sheet: ed.sheetName,
            name: row[1],
            regNo: String(row[3] || ""),
            dept: row[4] || ""
          };
        }
      });
    });

    const dbMatches = allStudentsDb.filter(s => {
      const cleanDbName = (s.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const dbReg = (s.registrationNumber || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const excelReg = excelMatch ? excelMatch.regNo.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

      if (excelReg && dbReg && dbReg === excelReg) return true;
      if (cleanDbName === cleanSearchName) return true;

      const searchTokens = targetName.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(t => t.length > 1);
      if (searchTokens.length > 0 && searchTokens.every(t => cleanDbName.includes(t))) {
        const dbCol = (s.college || "").toLowerCase();
        const groupKey = colGroup.toLowerCase().replace(/[^a-z]/g, "");
        if (dbCol.includes(groupKey)) return true;
      }
      return false;
    });

    const inDb = dbMatches.length > 0;
    const dbInfo = inDb ? dbMatches[0] : null;

    const regNo = dbInfo ? dbInfo.registrationNumber : (excelMatch ? excelMatch.regNo : "N/A");
    const dept = dbInfo ? dbInfo.department : (excelMatch ? excelMatch.dept : "N/A");
    const dbCollege = dbInfo ? dbInfo.college : "";

    let statusDetails = "";
    if (inDb) {
      statusDetails = `Present in Database (${dbCollege} - ${dept})`;
    } else {
      statusDetails = `Missing from Database - Found in Excel Tracker`;
    }

    finalRows.push({
      "S_NO": sNo,
      "College": colGroup,
      "Student Name": targetName,
      "Registration Number": regNo,
      "Department": dept,
      "In Database": inDb ? "Yes" : "No",
      "Status Details": statusDetails
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(finalRows);

  ws['!cols'] = [
    { wch: 6 },  // S_NO
    { wch: 22 }, // College
    { wch: 32 }, // Student Name
    { wch: 22 }, // Registration Number
    { wch: 15 }, // Department
    { wch: 14 }, // In Database
    { wch: 55 }  // Status Details
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Verification Report");

  const outputExcelPath = path.join(__dirname, "Student_Database_Verification_Report.xlsx");
  XLSX.writeFile(wb, outputExcelPath);
  console.log("Excel file generated without email column:", outputExcelPath);

  const csvPath = path.join(__dirname, "Student_Database_Verification_Report.csv");
  const csvHeaders = Object.keys(finalRows[0]);
  const csvLines = [
    csvHeaders.join(","),
    ...finalRows.map(r => csvHeaders.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))
  ];
  fs.writeFileSync(csvPath, csvLines.join("\n"));
  console.log("CSV file generated without email column:", csvPath);

  await connection.end();
}

main().catch(console.error);
