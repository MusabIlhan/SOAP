"""The three devices and each one's things to cover, from GUIDING-QUESTIONS.md."""

from schemas import Device, DeviceId, GuidingQuestion

DEVICES: list[Device] = [
    Device(
        id="leg",
        label="New leg or socket",
        questions=[
            GuidingQuestion(
                id="walk_today",
                label="Walking today",
                question="How far and how well does the patient walk today?",
                reviewer_need="Current functional ability",
            ),
            GuidingQuestion(
                id="walk_potential",
                label="Walking potential",
                question="What could the patient do with the new leg?",
                reviewer_need="Expected functional potential, i.e. the K-level (K0–K4), and why it differs from today",
            ),
            GuidingQuestion(
                id="wants_to_walk",
                label="Wish to walk",
                question="Does the patient want to walk, and for what?",
                reviewer_need="Desire to ambulate",
            ),
            GuidingQuestion(
                id="history",
                label="History",
                question="Why was the leg amputated, and what prosthesis have they used before?",
                reviewer_need="History, including earlier prosthetic use",
            ),
            GuidingQuestion(
                id="limb_and_health",
                label="Limb and health",
                question="How is the residual limb, and what other health problems affect walking?",
                reviewer_need="Current condition: residual limb, other medical problems",
            ),
            GuidingQuestion(
                id="why_this_device",
                label="Why this device",
                question="Why does the patient need this device now?",
                reviewer_need="For a replacement: a change in the patient's condition, or wear that can't be repaired",
            ),
            GuidingQuestion(
                id="test_result",
                label="Walking test",
                question="Was a walking test done, and what was the result?",
                reviewer_need="Supports the K-level (e.g. 6-minute walk, AMPPRO)",
            ),
        ],
    ),
    Device(
        id="afo",
        label="Ankle-foot brace",
        questions=[
            GuidingQuestion(
                id="afo_walks",
                label="Walking",
                question="Does the patient walk, and how?",
                reviewer_need="Ambulatory patient",
            ),
            GuidingQuestion(
                id="afo_weakness",
                label="Weakness or deformity",
                question="What weakness or deformity is in the foot and ankle?",
                reviewer_need="Weakness or deformity of the foot and ankle",
            ),
            GuidingQuestion(
                id="afo_why_support",
                label="Why support",
                question="Why does the ankle need holding steady, and what will the patient do better with it?",
                reviewer_need="Needs stabilization for medical reasons; potential to benefit functionally",
            ),
            GuidingQuestion(
                id="afo_why_custom",
                label="Why made to measure",
                question="If made to measure: why won't a ready-made brace do?",
                reviewer_need=(
                    "One of: can't fit a prefabricated one, need over 6 months, control in more than one plane, "
                    "skin or circulation at risk, a healing fracture"
                ),
            ),
        ],
    ),
    Device(
        id="ko",
        label="Knee brace",
        questions=[
            GuidingQuestion(
                id="ko_walks",
                label="Walking",
                question="Does the patient walk, and how?",
                reviewer_need="Ambulatory patient",
            ),
            GuidingQuestion(
                id="ko_instability",
                label="Knee stability",
                question="What did the exam show about the knee's stability?",
                reviewer_need=(
                    "Instability found on exam. Pain alone, or the patient's own description of instability, "
                    "does not count"
                ),
            ),
            GuidingQuestion(
                id="ko_diagnosis",
                label="Diagnosis",
                question="What condition causes it?",
                reviewer_need="A diagnosis from the policy article's list",
            ),
            GuidingQuestion(
                id="ko_why_custom",
                label="Why made to measure",
                question="If made to measure: why won't a ready-made brace do?",
                reviewer_need="Leg or knee deformity, thigh or calf size, or too little muscle to hold a brace",
            ),
        ],
    ),
]

_BY_ID: dict[str, Device] = {device.id: device for device in DEVICES}


def get_device(device_id: DeviceId) -> Device:
    return _BY_ID[device_id]
