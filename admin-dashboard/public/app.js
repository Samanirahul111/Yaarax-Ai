document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    initNavigation();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabSections = document.querySelectorAll('.tab-section');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const sectionInfo = {
        'overview-section': { title: 'Dashboard Overview', subtitle: 'Welcome back! Here\'s what\'s happening with Rock AI today.' },
        'users-section': { title: 'Users Management', subtitle: 'View and manage all registered users.' },
        'analytics-section': { title: 'Detailed Analytics', subtitle: 'Deep dive into your application usage and metrics.' },
        'settings-section': { title: 'System Settings', subtitle: 'Configure your dashboard and application settings.' }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all sections
            tabSections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });

            // Show target section
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                    // small delay for css animation if needed
                    setTimeout(() => targetSection.classList.add('active'), 10);
                }
                
                // Update header text
                if (sectionInfo[targetId]) {
                    pageTitle.textContent = sectionInfo[targetId].title;
                    pageSubtitle.textContent = sectionInfo[targetId].subtitle;
                }
            }
        });
    });
}

async function fetchStats() {
    const refreshBtn = document.querySelector('.btn-icon');
    refreshBtn.classList.add('refreshing');

    try {
        // Fetch all data in parallel
        const [statsRes, usersRes, analyticsRes] = await Promise.all([
            fetch('/api/stats').then(res => res.json()),
            fetch('/api/users').then(res => res.json()),
            fetch('/api/analytics').then(res => res.json())
        ]);

        if (statsRes.success) updateDashboard(statsRes.data);
        if (usersRes.success) updateUsersTable(usersRes.data);
        if (analyticsRes.success) updateAnalytics(analyticsRes.data);

    } catch (error) {
        console.error('Network error:', error);
    } finally {
        setTimeout(() => refreshBtn.classList.remove('refreshing'), 500);
    }
}

function updateUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-text">No users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        const date = new Date(user.created_at).toLocaleString();
        const twoFaBadge = user.two_factor_enabled 
            ? '<span class="badge badge-success">Enabled</span>' 
            : '<span class="badge badge-danger">Disabled</span>';
            
        tr.innerHTML = `
            <td>#${user.id}</td>
            <td><strong>${user.username}</strong></td>
            <td>${user.email}</td>
            <td>${date}</td>
            <td>${twoFaBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateAnalytics(data) {
    animateValue('analytics-tasks', 0, data.totalTasks || 0, 1000);
    animateValue('analytics-memories', 0, data.totalMemories || 0, 1000);

    const msgSplit = document.getElementById('analytics-msg-split');
    if (data.msgByRole && data.msgByRole.length > 0) {
        const userMsgs = data.msgByRole.find(m => m.role === 'user')?.count || 0;
        const aiMsgs = data.msgByRole.find(m => m.role === 'model' || m.role === 'assistant')?.count || 0;
        msgSplit.innerHTML = `<strong>${userMsgs}</strong> User / <strong>${aiMsgs}</strong> AI`;
    } else {
        msgSplit.textContent = 'No messages yet';
    }

    const topUsersList = document.getElementById('top-users-list');
    topUsersList.innerHTML = '';
    if (data.topUsers && data.topUsers.length > 0) {
        data.topUsers.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="feature-name">
                    <i data-lucide="user"></i>
                    ${user.username}
                </div>
                <div class="feature-count">${user.conv_count} conversations</div>
            `;
            topUsersList.appendChild(li);
        });
        lucide.createIcons();
    } else {
        topUsersList.innerHTML = '<li class="loading-text">No top users data.</li>';
    }
}

function updateDashboard(data) {
    // Update summary cards
    animateValue('total-users', 0, data.totalUsers, 1000);
    animateValue('total-conversations', 0, data.totalConversations, 1000);
    animateValue('total-messages', 0, data.totalMessages, 1000);

    // Update Feature Usage
    const featureList = document.getElementById('feature-usage-list');
    featureList.innerHTML = '';
    
    if (data.featureUsage && data.featureUsage.length > 0) {
        data.featureUsage.forEach(feature => {
            const li = document.createElement('li');
            
            // Map modes to nice names and icons
            let iconName = 'cpu';
            let niceName = feature.mode;
            
            if (feature.mode === 'auto') { iconName = 'sparkles'; niceName = 'Auto Mode'; }
            if (feature.mode === 'pdf') { iconName = 'file-text'; niceName = 'PDF Chat'; }
            if (feature.mode === 'video') { iconName = 'video'; niceName = 'Video Generator'; }
            if (feature.mode === 'web') { iconName = 'globe'; niceName = 'Web Chat'; }
            if (feature.mode === 'vision') { iconName = 'camera'; niceName = 'Vision AI'; }

            li.innerHTML = `
                <div class="feature-name">
                    <i data-lucide="${iconName}"></i>
                    ${niceName}
                </div>
                <div class="feature-count">${feature.count} uses</div>
            `;
            featureList.appendChild(li);
        });
        lucide.createIcons(); // Re-initialize icons for dynamic content
    } else {
        featureList.innerHTML = '<li class="loading-text">No usage data found.</li>';
    }

    // Update Recent Users
    const usersList = document.getElementById('recent-users-list');
    usersList.innerHTML = '';
    
    if (data.recentUsers && data.recentUsers.length > 0) {
        data.recentUsers.forEach(user => {
            const li = document.createElement('li');
            const initial = user.username ? user.username.charAt(0).toUpperCase() : '?';
            const date = new Date(user.created_at).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric' 
            });

            li.innerHTML = `
                <div class="user-avatar">${initial}</div>
                <div class="user-details">
                    <h4>${user.username}</h4>
                    <p>Joined ${date}</p>
                </div>
            `;
            usersList.appendChild(li);
        });
    } else {
        usersList.innerHTML = '<li class="loading-text">No users found.</li>';
    }
}

// Animation function for counting numbers up
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
