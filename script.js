// ========================== VARIABLES ==========================
let provider;
let signer;
let contract;
let usdt;
let user;
let bigToken;
let txFinished = false;
let epochDurationFromContract = 0;
let epochStartFromContract = 0;
let timerStarted = false;
let leaderboard = [];
let usernameContract;

// BIGFUNDToken deployed contract address
const bigTokenAddress = "0x4DDCC6D9ae0B793d6a5351d8E6AcCcF1949f3D77";


const usernameContractAddress =
    "0x1cAe50821fEEd59f4c0a2C45cB010E859Cbdb5B9";

const usernameABI = [
    "function getUsername(address) view returns(string)",
    "function hasUsername(address) view returns(bool)",
    "function setUsername(string)",
    "function editUsername(string)"
];

// Replace with your NEW deployed BigFund rewards contract address.
const contractAddress = "0xed4f7B19694300989665Ae7a22e024f374cB08B8";

const usdtAddress =
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

const abi = [
    "function currentEpoch() view returns(uint256)",
    "function epochStart() view returns(uint256)",
    "function getEpochDuration() view returns(uint256)",
    "function epochDuration() view returns(uint256)",

    "function pendingReward(address) view returns(uint256)",
    "function rewardPoolUSDT() view returns(uint256)",
    "function getLastEpochRewardSnapshot() view returns(uint256)",

    "function users(address) view returns(address,uint8,uint256,uint256,uint256,uint256)",
    "function register(address)",

    "function joinLevel1()",
    "function joinLevel2()",
    "function joinLevel3()",
    "function joinLevel4()",
    "function joinLevel5()",
    "function joinLevel6()",
    "function joinLevel7()",
    "function joinLevel8()",
    "function joinLevel9()",
    "function joinLevel10()",

    "function claimReward()",
    "function levelPriceUSD(uint8) view returns(uint256)",
    "function downlineCount(address) view returns(uint256)",
    "function epochTotalWeight() view returns(uint256)",
    "function totalWeight() view returns(uint256)",

    "function getIncomeBalanceUSDT(address) view returns(uint256)",
    "function getTotalEarnedUSDT(address) view returns(uint256)",
    "function withdrawIncome()",
    "function isRegistered(address) view returns(bool)",
    "function getUserID(address) view returns(uint256)",
    "function getUserJoinEpoch(address) view returns(uint256)",
    "function getUserLastClaimEpoch(address) view returns(uint256)",
    "function getTotalInvestedUSDT(address) view returns(uint256)",
    
    "function currentMonthlyEpoch() view returns(uint256)",
    "function getMonthlyEpochStatus() view returns(bool,uint256)",
    "function pendingMonthlyRoyalty(address) view returns(uint256)",
    "function getLastMonthlyRewardSnapshot() view returns(uint256)",
    "function claimMonthlyRoyalty()",
    "function monthlyRewardPoolUSDT() view returns(uint256)",

    "event Registered(address indexed user,address indexed referrer)",
    "event LevelJoined(address indexed user,uint8 level,uint256 usdtAmount)",
    "event RewardClaimed(address indexed user,uint256 usdtReward,uint256 epoch,uint256 blockNumber)",
    "event IncomeWithdrawn(address indexed user,uint256 gross,uint256 tax,uint256 net)"
];

const usdtABI = [
    "function approve(address,uint256) returns(bool)"
];


const bigTokenABI = [
    "function claimLevelReward()",
    "function availableForClaim(address) view returns(uint256)",
    "function stakedCoins(address) view returns(uint256)",
    "function levelRewardMintingEnabled() view returns(bool)",
    "function balanceOf(address) view returns(uint256)"
];


// ========================== HELPERS ==========================
function formatUSDT(value) {
    return Number(
        ethers.utils.formatUnits(value, 6)
    ).toFixed(4);
}

// ✅ NEW
function formatTime(ts){
  return new Date(ts * 1000).toLocaleString();
}

// ========================== CONNECT WALLET ==========================
async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not found!");
      return;
    }

    await window.ethereum.request({ method: 'eth_requestAccounts' });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    user = await signer.getAddress();
    
    
    //======referral=========
    document.getElementById("refLink").value =
      window.location.href.split("?")[0] + "?ref=" + user;
    
    contract = new ethers.Contract(contractAddress, abi, signer);  
    usdt = new ethers.Contract(usdtAddress, usdtABI, signer);
      
    bigToken = new ethers.Contract(
       bigTokenAddress,
       bigTokenABI,
       signer
    );

    //======leaderboard=========//
    usernameContract = new ethers.Contract(
    usernameContractAddress,
    usernameABI,
    signer
    );
     
    await updateWalletDisplay(); 

    const id = await contract.getUserID(user);

    document.getElementById("userIdBadge").innerText =
        "ID." + id.toString();
      
    const registered = await contract.isRegistered(user);

    document.getElementById("registerBox").style.display =
        registered ? "none" : "block";  

    document.getElementById("welcomePromoBox").style.display =
        registered ? "none" : "block"; 

    document.getElementById("welcomePromoBox1").style.display =
        registered ? "none" : "block";  
      
   // Load all user data first
   await loadData();

  await loadUserData();

  await loadBigCoinData();   
  await loadMonthlyRoyaltyData();
      
  document.getElementById("systemBox").style.display = "grid";
  document.getElementById("userBox").style.display = "none";

  document.getElementById("tabSystem").classList.add("active");
  document.getElementById("tabUser").classList.remove("active");
      
      
   // Start leaderboard after the current UI has rendered
    setTimeout(() => {

        loadLeaderboard().catch(err => {

           console.error(err);

        });

    }, 0);
   
    startTimers(); // ✅ ADDED
    listenEvents();

  } catch (err) {
    console.log(err);
  }
}



async function updateWalletDisplay(){

    if(!user) return;

    if(!usernameContract){
        document.getElementById("wallet").innerText =
            user.substring(0,6) + "..." + user.substring(user.length-4);
        return;
    }

    try{

        const hasName = await usernameContract.hasUsername(user);

        if(hasName){

            const username = await usernameContract.getUsername(user);

            document.getElementById("wallet").innerHTML = "👤 " + username;

        }else{

            document.getElementById("wallet").innerHTML = "➕ Set Username";

        }

    }catch(err){

        document.getElementById("wallet").innerText =
            user.substring(0,6) + "..." + user.substring(user.length-4);

    }

}



// ========================== LOAD DASHBOARD DATA ==========================
async function loadData(){
  try{
    
    // ✅ SYSTEM DATA ONLY
   document.getElementById("epoch").innerText =
     await contract.currentEpoch();

  const rewards = await contract.pendingReward(user);

  document.getElementById("pendingUSDT").innerText =
    Number(ethers.utils.formatUnits(rewards, 6)).toFixed(2);

  const rewardPoolUSDT = await contract.rewardPoolUSDT();
 
    document.getElementById("rewardPoolUSDT").innerText =
      Number(ethers.utils.formatUnits(rewardPoolUSDT, 6)).toFixed(2);
    

    // ✅ FETCH EPOCH START
    epochStartFromContract = Number(await contract.epochStart());

    document.getElementById("epochStart").innerText =
      formatTime(epochStartFromContract);

    epochDurationFromContract = Number(await contract.getEpochDuration());

    // ✅ NEXT EPOCH
    // ================= NEXT EPOCH (FINAL FIX) =================
    if (epochStartFromContract > 0 && epochDurationFromContract > 0) {

  const nextEpoch = epochStartFromContract + epochDurationFromContract;

  document.getElementById("nextEpoch").innerText =
    formatTime(nextEpoch);

  // ✅ Used by claimTimer (same countdown)
    } 

  }catch(e){
    console.log(e);
  }
}



async function loadMonthlyRoyaltyData() {
    if (!contract || !user) return;

    try {
        const [
            monthlyEpoch,
            monthlyPool,
            pending,
            lastSnapshot,
            epochStatus
        ] = await Promise.all([
            contract.currentMonthlyEpoch(),
            contract.monthlyRewardPoolUSDT(),
            contract.pendingMonthlyRoyalty(user),
            contract.getLastMonthlyRewardSnapshot(),
            contract.getMonthlyEpochStatus()
        ]);

        document.getElementById("pendingMonthlyRoyaltyUSDT").innerText =
            Number(formatUSDT(pending)).toFixed(2);

        
        document.getElementById("monthlyRewardPoolUSDT").innerText =
            Number(formatUSDT(monthlyPool)).toFixed(2);

        document.getElementById("lastMonthlyRewardUSDT").innerText =
            Number(formatUSDT(lastSnapshot)).toFixed(2);

        // Time left until monthly epoch ends
        const isEnded = epochStatus[0];
        const timeLeft = Number(epochStatus[1]);

        const timeElement =
            document.getElementById("monthlyEpochTimeLeft");

        if (isEnded) {
            timeElement.innerText = "Round Ended";
        } else {
            const days = Math.floor(timeLeft / 86400);
            const hours = Math.floor((timeLeft % 86400) / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);

            timeElement.innerText =
                `${days}d ${hours}h ${minutes}m`;
        }

        const claimButton =
            document.getElementById("claimMonthlyRoyaltyBtn");

        if (claimButton) {
            claimButton.disabled = pending.isZero();
            claimButton.innerText = pending.isZero()
                ? "No Monthly Royalty Available"
                : "Claim Monthly Royalty";
        }

        const statusElement =
            document.getElementById("monthlyRoyaltyStatus");

        if (statusElement) {
            statusElement.innerText = pending.isZero()
                ? "No pending monthly royalty available."
                : "Your monthly royalty is available to claim.";
        }

    } catch (error) {
        console.error("Monthly Royalty data error:", error);

        const statusElement =
            document.getElementById("monthlyRoyaltyStatus");

        if (statusElement) {
            statusElement.innerText =
                "Unable to load monthly royalty details.";
        }
    }
}



// ========================== TIMER ==========================
// ========================== TIMER ==========================
function startTimers() {
    if (timerStarted) return;
    timerStarted = true;

    function updateTimers() {
        const now = Math.floor(Date.now() / 1000);
        const start = epochStartFromContract;
        const duration = epochDurationFromContract;

        if (!start || !duration) return;

        const nextEpoch = start + duration;
        let remaining = Math.max(0, nextEpoch - now);

        const d = Math.floor(remaining / 86400);
        remaining %= 86400;

        const h = Math.floor(remaining / 3600);
        remaining %= 3600;

        const m = Math.floor(remaining / 60);
        const s = remaining % 60;

        const timeText = `${d}d ${h}h ${m}m ${s}s`;

        document.getElementById("epochTimer").innerText = timeText;
        document.getElementById("claimTimer").innerText = timeText;
    }

    updateTimers();
    setInterval(updateTimers, 1000);
}
// ========================== HANDLE TRANSACTIONS ==========================
async function handleTx(tx){
  txFinished = false;
  try{
    // ⏳ waiting wallet confirm
    document.getElementById("status").innerHTML =
      `<span class="tx-pending">⏳ Waiting for confirmation...</span>`;

    const sent = await tx;

    // 🔄 pending with polygonscan link
    document.getElementById("status").innerHTML =
      `<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">
        🔄 Transaction Pending (View)
      </a>`;

    await sent.wait();

    // Refresh dashboard immediately after confirmation
    await loadData();
    await loadUserData();  
    await loadBigCoinData();
    await loadMonthlyRoyaltyData();

    document.getElementById("status").innerHTML =
      `<span class="tx-success">✅ Transaction Confirmed</span>`;

    // wait 2 seconds before allowing events
    setTimeout(()=>{
      txFinished = true;
    },2000);

  }catch(e){
    document.getElementById("status").innerHTML =
      `<span class="tx-fail">❌ Transaction Failed</span>`;
  }
}

// ========================== USER ACTIONS ==========================
async function register() {
  const ref = document.getElementById("ref").value.trim();

  if (!ethers.utils.isAddress(ref)) {
    document.getElementById("status").innerText =
      "Enter a valid referrer wallet address.";
    return;
  }

  handleTx(contract.register(ref));
}

async function approveUSDT() {
  const amount = "15000";
  const value = ethers.utils.parseUnits(amount, 6);

  handleTx(
    usdt.approve(contractAddress, value)
  );
}

async function joinLevel(l){
  if(l==1) handleTx(contract.joinLevel1());
  if(l==2) handleTx(contract.joinLevel2());
  if(l==3) handleTx(contract.joinLevel3());
  if(l==4) handleTx(contract.joinLevel4());
  if(l==5) handleTx(contract.joinLevel5());
  if(l==6) handleTx(contract.joinLevel6());
  if(l==7) handleTx(contract.joinLevel7());
  if(l==8) handleTx(contract.joinLevel8());
  if(l==9) handleTx(contract.joinLevel9());
  if(l==10) handleTx(contract.joinLevel10());
}

async function claimReward(){
  handleTx(contract.claimReward());
}


async function claimMonthlyRoyalty() {
    handleTx(contract.claimMonthlyRoyalty());
}


async function loadBigCoinData() {
    const availableEl = document.getElementById("availableBigCoins");
    const claimedEl = document.getElementById("totalClaimedBigCoins");
    const button = document.getElementById("claimBigCoinsBtn");
    const status = document.getElementById("bigCoinStatus");

    if (!bigToken || !user) {
        availableEl.innerText = "0.00";
        claimedEl.innerText = "0.00";
        button.disabled = true;
        button.innerText = "Connect Wallet to Claim";
        return;
    }

    try {
        availableEl.innerText = "Loading...";
        claimedEl.innerText = "Loading...";

        const results = await Promise.all([
            bigToken.availableForClaim(user),
            bigToken.stakedCoins(user),
            bigToken.levelRewardMintingEnabled()
        ]);

        const available = results[0];
        const claimed = results[1];
        const enabled = results[2];

        availableEl.innerText =
            Number(ethers.utils.formatUnits(available, 18)).toLocaleString(
                "en-US",
                { maximumFractionDigits: 2 }
            );

        claimedEl.innerText =
            Number(ethers.utils.formatUnits(claimed, 18)).toLocaleString(
                "en-US",
                { maximumFractionDigits: 2 }
            );

        const canClaim = enabled && available.gt(0);

        button.disabled = !canClaim;
        button.innerText = !enabled
            ? "Claims Temporarily Disabled"
            : canClaim
                ? "Claim BIG Coins"
                : "No Coins Available";

        status.innerText = !enabled
            ? "BIG coin claims are currently disabled."
            : canClaim
                ? "Your eligible, unclaimed level rewards are ready."
                : "No unclaimed level rewards. Complete another level to earn more.";

    } catch (err) {
        console.error("BIG coin data error:", err);
        availableEl.innerText = "--";
        claimedEl.innerText = "--";
        button.disabled = true;
        button.innerText = "Unable to Load Coins";
        status.innerText =
            "Could not load BIG coin data. Check the token contract address and network.";
    }
}


async function claimBigCoins() {
    if (!bigToken || !user) {
        document.getElementById("bigCoinStatus").innerText =
            "Please connect your wallet first.";
        return;
    }

    const button = document.getElementById("claimBigCoinsBtn");
    const status = document.getElementById("bigCoinStatus");

    try {
        button.disabled = true;
        button.innerText = "Confirm in Wallet...";
        status.innerText = "Please confirm the transaction in your wallet.";

        const tx = await bigToken.claimLevelReward();

        button.innerText = "Claiming...";
        status.innerText = "Transaction submitted. Waiting for confirmation...";

        await tx.wait();

        await loadBigCoinData();

        // Refresh main dashboard in case the level or other data changed.
        await loadUserData();

        status.innerText = "BIG coins claimed successfully✅";
    } catch (err) {
        console.error("BIG coin claim error:", err);

        status.innerText =
            err?.code === 4001
                ? "Transaction cancelled in wallet."
                : (err?.reason || err?.error?.message || "Claim failed. Check the wallet and contract.");

        await loadBigCoinData();
    }
}


async function withdrawIncome() {
    if (!contract || !user) {
        document.getElementById("status").innerText =
            "Please connect your wallet first.";
        return;
    }

    try {
        document.getElementById("status").innerText =
            "Waiting for wallet confirmation...";

        const tx = await contract.withdrawIncome();

        document.getElementById("status").innerText =
            "Withdrawal transaction pending...";

        await tx.wait();

        document.getElementById("status").innerText =
            "✅ USDT withdrawal successful!";

        await loadUserData();

    } catch (err) {
        console.error("Withdrawal error:", err);

        document.getElementById("status").innerText =
            "❌ Withdrawal failed or cancelled.";
    }
}





// ========================== EVENT LISTENERS ==========================
function listenEvents() {
  if (!contract || !user) return;

  try {
    contract.on("Registered", (userAddr, referrer) => {
    if(userAddr.toLowerCase() === user.toLowerCase()){

        const showEvent = () => {
            document.getElementById("status").innerText =
              `Registered successfully with referrer: ${referrer}`;
            loadData();
        };

        if(txFinished){
            showEvent();
        }else{
            const timer = setInterval(()=>{
                if(txFinished){
                    clearInterval(timer);
                    showEvent();
                }
            },500);
        }
    }
});

   contract.on("LevelJoined", (userAddr, level, usdtAmount) => {

    if(userAddr.toLowerCase() !== user.toLowerCase()) return;

    const showEvent = async ()=>{
        document.getElementById("status").innerHTML =
       `✅ Joined Level ${level}<br>
       USDT: ${Number(
          ethers.utils.formatUnits(usdtAmount, 6)
       ).toFixed(4)}`

        loadData();
        loadUserData();
    };

    if(txFinished){
        showEvent();
    }else{
        const timer = setInterval(()=>{
            if(txFinished){
                clearInterval(timer);
                showEvent();
            }
        },500);
    }
});

   contract.on(
  "RewardClaimed",
  (userAddr, usdtReward, epoch, blockNumber) => {

    if(userAddr.toLowerCase() !== user.toLowerCase()) return;

    const showEvent = ()=>{
        document.getElementById("status").innerHTML =
        `✅ Reward Claimed<br>
         USDT: ${Number(
            ethers.utils.formatUnits(usdtReward,6)
         ).toFixed(4)}`;

        loadData();
        loadUserData();
    };

    if(txFinished){
        showEvent();
    }else{
        const timer = setInterval(()=>{
            if(txFinished){
                clearInterval(timer);
                showEvent();
            }
        },500);
    }
});

  } catch (err) {
    console.log(err);
  }
}

// ========================== INITIALIZE ==========================
// AUTO-FILL REFERRAL ADDRESS
function autoFillReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const input = document.getElementById("ref");

    if (ref && input && ethers.utils.isAddress(ref)) {
        input.value = ref;
    }
}

document.addEventListener("DOMContentLoaded", autoFillReferral);
autoFillReferral();

// ========================== REWARD CALCULATOR ==========================
function calculateReward() {

    document.getElementById("calcBaseWeight").value =
        document.getElementById("baseWeight").innerText;

    document.getElementById("calcTempWeight").value =
        document.getElementById("tempWeight").innerText;

    document.getElementById("calcTotalWeight").value =
        document.getElementById("epochWeight").innerText;

    const poolUSDT = parseFloat(
        document.getElementById("lastEpochRewardUSDT").innerText
    ) || 0;

    const base = parseFloat(
        document.getElementById("calcBaseWeight").value
    ) || 0;

    const temp = parseFloat(
        document.getElementById("calcTempWeight").value
    ) || 0;

    const total = parseFloat(
        document.getElementById("calcTotalWeight").value
    ) || 0;

    const userWeight = base + temp;

    if (total === 0) {
        document.getElementById("rewardResult").innerHTML =
            "⚠️ No participants yet";
        return;
    }

    const usdtReward = (poolUSDT * userWeight) / total;

    document.getElementById("rewardResult").innerHTML =
        `Estimated USDT Reward: ${usdtReward.toFixed(4)} USDT`;
}




// ================= TAB SWITCH =================

// ================= SYSTEM TAB =================
async function showSystem(){

  document.getElementById("systemBox").style.display = "grid";
  document.getElementById("userBox").style.display = "none";

  document.getElementById("tabSystem").classList.add("active");
  document.getElementById("tabUser").classList.remove("active");

  // ✅ LOADING STATE
  
  document.getElementById("epoch").innerText = "⏳ Loading...";
  document.getElementById("pendingUSDT").innerText = "⏳ Loading...";

  document.getElementById("rewardPoolUSDT").innerText = "⏳ Loading...";
  document.getElementById("epochWeight").innerText = "⏳ Loading...";
  document.getElementById("epochStart").innerText = "⏳ Loading...";
  document.getElementById("nextEpoch").innerText = "⏳ Loading...";
  
  document.getElementById("monthlyEpochTimeLeft").innerText = "⏳ Loading...";
  document.getElementById("pendingMonthlyRoyaltyUSDT").innerText = "⏳ Loading...";
  
  // ✅ FETCH DATA
  await loadData();
  await loadMonthlyRoyaltyData();
}


// ================= USER TAB =================
async function showUser(){

  document.getElementById("systemBox").style.display = "none";
  document.getElementById("userBox").style.display = "grid";

  document.getElementById("tabUser").classList.add("active");
  document.getElementById("tabSystem").classList.remove("active");

  // ✅ LOADING STATE
  document.getElementById("level").innerText = "⏳ Loading...";
  document.getElementById("baseWeight").innerText = "⏳ Loading...";
  document.getElementById("tempWeight").innerText = "⏳ Loading...";
  document.getElementById("totalWeight").innerText = "⏳ Loading...";
  document.getElementById("downline").innerText = "⏳ Loading...";
  document.getElementById("referrer").innerText = "⏳ Loading...";
  document.getElementById("lastEpochRewardUSDT").innerText = "⏳ Loading...";
  document.getElementById("lastClaimEpoch").innerText = "⏳ Loading...";
  document.getElementById("lastMonthlyRewardUSDT").innerText = "⏳ Loading...";

  
  // ✅ FETCH DATA
  await loadUserData();
  await loadMonthlyRoyaltyData();
}


// ================= USER DATA =================

async function loadUserData(){
  try{
    if(!contract || !user){
      console.log("Wallet not connected");
      return;
    }

    const u = await contract.users(user);

    document.getElementById("totalInvestedUSDT").innerText =
    Number(ethers.utils.formatUnits(
        await contract.getTotalInvestedUSDT(user), 6
    )).toFixed(2);
      
     
    document.getElementById("userEarnedUSDT").innerText =
       Number(ethers.utils.formatUnits(
          await contract.getTotalEarnedUSDT(user), 6
    )).toFixed(2);

   document.getElementById("incomeBalanceUSDT").innerText =
       Number(ethers.utils.formatUnits(
          await contract.getIncomeBalanceUSDT(user), 6
    )).toFixed(2);

    document.getElementById("level").innerText = u[1];
    // Update completed level button colours
   const completedLevel = Number(u[1]);

   document.querySelectorAll("#joinLevelsBox button").forEach((btn, i) => {
       btn.classList.toggle("level-completed", i < completedLevel);
   });

      
    document.getElementById("baseWeight").innerText = u[2];
    document.getElementById("tempWeight").innerText = u[3];
    document.getElementById("lastClaimEpoch").innerText = u[4];
    document.getElementById("totalWeight").innerText =
      await contract.totalWeight();

    document.getElementById("downline").innerText =
      await contract.downlineCount(user);

    const snapshot = await contract.getLastEpochRewardSnapshot();

   document.getElementById("lastEpochRewardUSDT").innerText =
      Number(ethers.utils.formatUnits(snapshot, 6)).toFixed(2);

    document.getElementById("epochWeight").innerText =
      await contract.epochTotalWeight();

    
    let ref = u[0];
    if(ref === "0x0000000000000000000000000000000000000000"){
      document.getElementById("referrer").innerText = "No Referrer";
    }else{
      document.getElementById("referrer").innerText =
        ref.slice(0,6) + "..." + ref.slice(-6);
    }

  }catch(e){
    console.log("User load error:", e);
  }
}


// ======copy Referral Adress======

function copyRef(){
  const link = document.getElementById("refLink").value;

  if(!link){
    alert("Connect wallet first");
    return;
  }

  navigator.clipboard.writeText(link);
  alert("✅ Link copied!");
}







// =========================================
// LOAD LAST EPOCH LEADERBOARD (FAST + CACHE)
// =========================================

async function loadLeaderboard(){

    try{

        if(!contract || !provider) return;

        const board = document.getElementById("leaderboard");

        if(!board) return;

        board.innerHTML =
        "<div class='leader-loading'>Loading Leaderboard...</div>";

        const currentEpoch = Number(
            await contract.currentEpoch()
        );

        const lastEpoch = currentEpoch - 1;

        if(lastEpoch < 0){

            renderLeaderboard([]);

            return;

        }

        // ==========================
        // SHOW CACHE INSTANTLY
        // ==========================

        const cacheKey = "leaderboard_" + lastEpoch;

        const cache = localStorage.getItem(cacheKey);

        if(cache){

            try{

                leaderboard = JSON.parse(cache);

                renderLeaderboard(leaderboard);

            }catch(e){}

        }

        // ==========================
        // READ EVENTS
        // ==========================
          // ==========================
// READ EVENTS (DEBUG)
// ==========================

const DEPLOY_BLOCK = 95964695;

const latestBlock = await provider.getBlockNumber();

const epochSeconds = Number(await contract.getEpochDuration());

const avgBlockTime = 1.5;

const blocksPerEpoch = Math.ceil(epochSeconds / avgBlockTime);

const safetyBlocks = 20000;

console.log("Latest Block:", latestBlock);
console.log("Epoch Seconds:", epochSeconds);
console.log("Blocks Per Epoch:", blocksPerEpoch);

const fromBlock = Math.max(
    DEPLOY_BLOCK,
    latestBlock - blocksPerEpoch - safetyBlocks
);

console.log("From Block:", fromBlock);

const filter = contract.filters.RewardClaimed();

const events = [];

const CHUNK = 10000;

for (let start = fromBlock; start <= latestBlock; start += CHUNK) {

    const end = Math.min(start + CHUNK - 1, latestBlock);

    try {

        const logs = await contract.queryFilter(
            filter,
            start,
            end
        );

        events.push(...logs);

    } catch (err) {

        console.log("Chunk failed:", start);

    }

}

console.log("Events:", events.length);
        
        // ==========================
        // BUILD USERS
        // ==========================

        const users = {};

        for(const e of events){

            if(Number(e.args.epoch)!==lastEpoch)
                continue;

            const wallet = e.args.user;

            if(!users[wallet]){

                users[wallet]={

                    wallet,

                    username:"",

                    

                    usdt:0

                };

            }

        

            users[wallet].usdt += Number(

                ethers.utils.formatUnits(

                    e.args.usdtReward,

                    6

                )

            );

        }

        // ==========================
        // LOAD USERNAMES
        // ==========================

        const wallets =

        Object.keys(users);

        await Promise.all(

            wallets.map(

                async(wallet)=>{

                    try{

                        let username =

                        await usernameContract.getUsername(

                            wallet

                        );

                        if(

                            !username ||

                            username.trim()===""

                        ){

                            username =

                            wallet.substring(0,6)

                            +"..."+

                            wallet.substring(

                                wallet.length-4

                            );

                        }

                        users[wallet].username =

                        username;

                    }

                    catch{

                        users[wallet].username =

                        wallet.substring(0,6)

                        +"..."+

                        wallet.substring(

                            wallet.length-4

                        );

                    }

                }

            )

        );

        // ==========================
        // SORT
        // ==========================

       // ==========================
// BUILD LEADERBOARD
// ==========================
 leaderboard = Object.values(users).filter(u =>
    u.usdt > 0
);

leaderboard.sort((a, b) => b.usdt - a.usdt);

leaderboard = leaderboard.slice(0, 20);

    // ==========================
        // SAVE CACHE
        // ==========================

        localStorage.setItem(

            cacheKey,

            JSON.stringify(

                leaderboard

            )

        );

        renderLeaderboard(

            leaderboard

        );

    }

    catch(err){

        console.error(

            "Leaderboard:",

            err

        );

        document.getElementById(

            "leaderboard"

        ).innerHTML =

        "<div class='leader-loading'>Failed to load leaderboard</div>";

    }











    // =========================================
// RENDER LEADERBOARD
// =========================================

function renderLeaderboard(data){

    const box = document.getElementById("leaderboard");

    if(!box) return;

    if(!data || data.length===0){

        box.innerHTML=`
        <div class="leader-empty">
            No rewards claimed in last epoch.
        </div>`;

        return;

    }

    let html="";

    const total=Math.min(data.length,20);

    for(let i=0;i<total;i++){

        const u=data[i];

        let medal="";
        let cls="leader-item";

        if(i===0){

            medal="🥇";
            cls+=" gold";

        }
        else if(i===1){

            medal="🥈";
            cls+=" silver";

        }
        else if(i===2){

            medal="🥉";
            cls+=" bronze";

        }

        const walletShort=
        u.wallet.substring(0,8)+
        "..."+
        u.wallet.substring(u.wallet.length-4);

        html+=`

        <div class="${cls}">

            <div class="leader-rank">

                ${medal || (i+1)}

            </div>

            <div class="leader-center">

                <div class="leader-name">

                    ${u.username}

                </div>

                <div class="leader-wallet">

                    ${walletShort}

                </div>

            </div>

            <div class="leader-right">

                <div class="leader-usdt">
    
                ${Number(u.usdt).toFixed(4)} USDT
                
                </div>

            </div>

        </div>

        `;

    }

    box.innerHTML=html;

}
}





async function setOrEditUsername(){

    if(!user){

        alert("Connect wallet first");

        return;

    }

    try{

        const hasName = await usernameContract.hasUsername(user);

        let oldName = "";

        if(hasName){

            oldName = await usernameContract.getUsername(user);

        }

        const username = prompt(
            hasName ? "Edit Username" : "Set Username",
            oldName
        );

        if(username === null) return;

        if(username.trim() === ""){

            alert("Username cannot be empty");

            return;

        }

        let tx;

        if(hasName){

            tx = await usernameContract.editUsername(username.trim());

        }else{

            tx = await usernameContract.setUsername(username.trim());

        }

        document.getElementById("status").innerHTML =
            "⏳ Waiting for confirmation...";

        await tx.wait();

        document.getElementById("status").innerHTML =
            "✅ Username Updated";

        await updateWalletDisplay();

    }catch(err){

        console.log(err);

        document.getElementById("status").innerHTML =
            "❌ Username Update Failed";

    }

}



document.querySelectorAll('#myMenu a, #myMenu button').forEach(function(item) {
  item.addEventListener('click', function() {
    document.getElementById('myMenu').style.display = 'none';
  });
});





/* LEADERBOARD TOUCH SCROLL */
(function () {
    const list = document.getElementById("leaderboard");
    if (!list) return;

    list.style.display = "block";
    list.style.height = "300px";
    list.style.maxHeight = "300px";
    list.style.overflowY = "auto";
    list.style.overflowX = "hidden";
    list.style.touchAction = "pan-y";
    list.style.webkitOverflowScrolling = "touch";

    list.addEventListener("touchmove", function (e) {
        e.stopPropagation();
    }, { passive: true });
})();





window.addEventListener("scroll", function () {
    const btn = document.querySelector(".menu-btn");
    if (!btn) return;

    btn.style.transform = window.scrollY > 50
        ? "scale(0.5)"
        : "scale(1)";
});




window.addEventListener("scroll", function () {
    const btn = document.querySelector(".menu-btn");
    if (!btn) return;

    if (window.scrollY > 50) {
        btn.style.setProperty("position", "fixed", "important");
        btn.style.setProperty("right", "0px", "important");
        btn.style.setProperty("left", "auto", "important");
        btn.style.setProperty("z-index", "99999", "important");
    } else {
        btn.style.removeProperty("position");
        btn.style.removeProperty("right");
        btn.style.removeProperty("left");
        btn.style.removeProperty("z-index");
    }
});
