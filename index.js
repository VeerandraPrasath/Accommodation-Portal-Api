import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import pool from './db.js';

import bookingRoutes from './routes/bookings.js';
import historiesRoute from './routes/histories.js' 
import accommodationsRoute from './routes/accommodations.js'
import cityRoutes from './routes/cities.js';
import occupancyRoutes from './routes/occupancy.js';
import userRoutes from './routes/users.js';
import apartmentRoutes from './routes/apartments.js';
import flatRoutes from './routes/flats.js';
import roomRoutes from './routes/rooms.js';
import bedRoutes from './routes/beds.js';
import availabilityRoutes from './routes/availability.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const {
  CLIENT_ID,
  CLIENT_SECRET,
  TENANT_ID,
  REDIRECT_URI,
  FRONTEND_URL
} = process.env;

// Step 1: Redirect to Microsoft login
app.get("/login", (req, res) => {
  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_mode=query&scope=openid profile email User.Read`;
  res.redirect(authUrl);
});

// Step 2: Callback from Microsoft with ?code=
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        scope: "User.Read openid profile email",
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        client_secret: CLIENT_SECRET
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 3: Fetch user info using Graph API
    const userResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = userResponse.data;

    // Step 4: Redirect to frontend with user info
    const name = encodeURIComponent(user.displayName);
const email = encodeURIComponent(user.mail || user.userPrincipalName);
const jobTitle = encodeURIComponent(user.jobTitle || "Not specified");
const gender = encodeURIComponent(user.gender || "Not specified");
res.redirect(`${FRONTEND_URL}/dashboard?name=${name}&email=${email}&jobTitle=${jobTitle}&gender=${gender}`);
  } catch (err) {
    console.error("❌ Auth Error:", err.response?.data || err.message);
    res.status(500).send("Authentication Failed");
  }
});



async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database Connected! Current time:', res.rows[0]);
  } catch (err) {
    console.error('Database Connection Failed:', err);
  }
}

testConnection();

app.use('/api/cities', cityRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/apartments', apartmentRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/rooms',roomRoutes)
app.use('/api/occupancy',occupancyRoutes);
// app.use('api/availability',availabilityRoutes)
app.use('/api/bookings',bookingRoutes)
app.use('/api/requests',historiesRoute)
app.use('/api/accommodation',accommodationsRoute)
app.use('/api/beds',bedRoutes);
app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});





