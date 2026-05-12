
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 题目表
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    content TEXT NOT NULL,
    options JSON NOT NULL,
    correct_answer INT NOT NULL,
    explanation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 学习记录表
CREATE TABLE IF NOT EXISTS study_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    memory_strength INT DEFAULT 0,
    next_review_at DATETIME,
    last_reviewed_at DATETIME,
    review_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question (user_id, question_id)
);

-- 插入初始数据
INSERT IGNORE INTO categories (name, description) VALUES
('通信基础知识', '通信岗位基础题目'),
('专业技能', '专业技能题目');

-- 插入示例题目
INSERT IGNORE INTO questions (category_id, content, options, correct_answer, explanation) VALUES
(1, '光纤通信中，常用的波长窗口是？', '["850nm", "1310nm", "1550nm", "以上都是"]', 3, '光纤通信常用三个波长窗口包括850nm、1310nm和1550nm'),
(1, 'TCP/IP协议中，IP层对应OSI模型的哪一层？', '["数据链路层", "网络层", "传输层", "应用层"]', 1, 'IP协议工作在OSI模型的网络层'),
(1, '以下哪个不是移动通信系统？', '["GSM", "CDMA", "WiFi", "LTE"]', 2, 'WiFi是无线局域网技术，不是移动通信系统'),
(2, '光缆熔接时，最重要的参数是？', '["熔接电流", "熔接时间", "光纤端面清洁", "以上都是"]', 3, '光缆熔接时，端面清洁、熔接电流和时间都很重要'),
(2, 'OTDR测试仪用于测量什么？', '["光纤长度", "光纤损耗", "故障点位置", "以上都是"]', 3, 'OTDR可测量光纤长度、损耗和故障点位置');

-- 插入示例用户 (密码: admin123 / user123)
INSERT IGNORE INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
('testuser', 'user@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user');
