import enum


class ManeuverStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    FINALIZADA = "FINALIZADA"


class ManeuverAction(str, enum.Enum):
    ABRIR = "ABRIR"
    FECHAR = "FECHAR"


class ManeuverStepOrigin(str, enum.Enum):
    SIMULADOR = "SIMULADOR"
    MANUAL = "MANUAL"


class ProvisionalElementType(str, enum.Enum):
    JUMPER = "JUMPER"
    CHAVE_PROVISORIA = "CHAVE_PROVISORIA"
