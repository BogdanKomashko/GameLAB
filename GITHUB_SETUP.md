# Інструкція для створення репозиторію на GitHub

## Крок 1: Створіть новий репозиторій на GitHub

1. Перейдіть на https://github.com/new
2. Назвіть репозиторій: **гра** (або **game**)
3. **НЕ** створюйте README, .gitignore або license (вони вже є)
4. Натисніть "Create repository"

## Крок 2: Підключіть локальний репозиторій до GitHub

Після створення репозиторію на GitHub, виконайте команди:

```bash
git remote add origin https://github.com/BogdanKomashko/гра.git
git push -u origin main
```

Або якщо репозиторій називається "game":

```bash
git remote add origin https://github.com/BogdanKomashko/game.git
git push -u origin main
```

## Готово! 🎮

Ваша гра тепер на GitHub!

