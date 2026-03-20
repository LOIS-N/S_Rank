ALTER TABLE public.gacha_log
    ALTER COLUMN special_skill_code DROP NOT NULL;

ALTER TABLE public.user_main_quest_card_log
    ALTER COLUMN special_skill_code DROP NOT NULL;

ALTER TABLE public.user_sub_quest_card_log
    ALTER COLUMN special_skill_code DROP NOT NULL;
